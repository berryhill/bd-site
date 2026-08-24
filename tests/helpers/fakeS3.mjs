export class FakeS3 {
  objects = new Map();
  pointerWrites = 0;
  failBeforePointer = false;
  replacePointerAfterWrite = false;
  forbiddenListCalls = 0;
  headFailure = null;
  getFailure = null;

  async send(command) {
    const name = command.constructor.name;
    const input = command.input;
    const key = input.Key;

    if (name === "HeadBucketCommand") {
      if (this.headFailure) throw this.headFailure;
      return {};
    }
    if (name === "ListObjectsV2Command") {
      this.forbiddenListCalls += 1;
      throw new Error("catalog readers must not list the bucket");
    }
    if (name === "GetObjectCommand") {
      if (this.getFailure) throw this.getFailure;
      const object = this.objects.get(key);
      if (!object) {
        throw Object.assign(new Error("missing"), {
          name: "NoSuchKey",
          $metadata: { httpStatusCode: 404 },
        });
      }
      return {
        ETag: object.etag,
        Body: { transformToByteArray: async () => Uint8Array.from(object.body) },
      };
    }
    if (name === "PutObjectCommand") {
      if (this.failBeforePointer && key.endsWith("control/catalog-pointer.json")) {
        throw Object.assign(new Error("injected timeout"), { name: "TimeoutError" });
      }
      const current = this.objects.get(key);
      if (input.IfNoneMatch === "*" && current) {
        throw Object.assign(new Error("precondition"), {
          name: "PreconditionFailed",
          $metadata: { httpStatusCode: 412 },
        });
      }
      if (input.IfMatch && (!current || input.IfMatch !== current.etag)) {
        throw Object.assign(new Error("precondition"), {
          name: "PreconditionFailed",
          $metadata: { httpStatusCode: 412 },
        });
      }
      const body = Uint8Array.from(input.Body);
      const etag = `\"provider-etag-${Math.random()}-5\"`;
      this.objects.set(key, { body, etag, metadata: input.Metadata ?? {} });
      if (key.endsWith("control/catalog-pointer.json")) {
        this.pointerWrites += 1;
        if (this.replacePointerAfterWrite) {
          this.objects.set(key, {
            body: new TextEncoder().encode('{"substituted":true}'),
            etag: '"replacement-etag"',
            metadata: {},
          });
          return {};
        }
      }
      return { ETag: etag };
    }
    throw new Error(`Unsupported command: ${name}`);
  }
}
