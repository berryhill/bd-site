/* eslint-disable no-console */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

let passed = 0;
let failed = 0;

function recordFailure(name, error) {
  failed += 1;
  console.error(`FAIL ${name}`);
  console.error(error);
}

function test(name, fn) {
  try {
    fn();
    passed += 1;
  } catch (error) {
    recordFailure(name, error);
  }
}

function readRepoFile(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const workflow = readRepoFile(".github/workflows/deploy.yaml");
const values = readRepoFile("helm/values.yaml");
const deploymentTemplate = readRepoFile("helm/templates/deployment.yaml");

test("main deployment builds and pushes a unique image tag from the exact GitHub revision", () => {
  assert.match(workflow, /if: github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /IMAGE_TAG="\$\{GITHUB_SHA\}"/);
  assert.match(workflow, /image-tag: \$\{\{ steps\.image\.outputs\.image_tag \}\}/);
  assert.match(workflow, /echo "image_tag=\$\{IMAGE_TAG\}" >> "\$\{GITHUB_OUTPUT\}"/);
  assert.match(workflow, /docker build[\s\S]*-t \$\{\{ env\.DOCKER_REGISTRY \}\}\/\$\{\{ env\.DOCKER_ORG \}\}\/\$\{\{ env\.DOCKER_IMAGE \}\}:\$\{IMAGE_TAG\}/);
  assert.match(workflow, /docker push \$\{\{ env\.DOCKER_REGISTRY \}\}\/\$\{\{ env\.DOCKER_ORG \}\}\/\$\{\{ env\.DOCKER_IMAGE \}\}:\$\{IMAGE_TAG\}/);
  assert.doesNotMatch(workflow, /DOCKER_TAG:\s*0\.0\.56/);
  assert.doesNotMatch(workflow, /env\.DOCKER_TAG/);
});

test("deploy passes the exact built revision to Helm as image tag and rollout annotation", () => {
  assert.match(workflow, /IMAGE_TAG="\$\{\{ needs\.build-push\.outputs\.image-tag \}\}"/);
  assert.match(workflow, /\[ "\$\{IMAGE_TAG\}" != "\$\{GITHUB_SHA\}" \]/);
  assert.match(workflow, /--set image\.tag="\$\{IMAGE_TAG\}"/);
  assert.match(workflow, /--set deploymentRevision="\$\{GITHUB_SHA\}"/);
  assert.match(workflow, /Deploying .*:\$\{IMAGE_TAG\} with revision \$\{GITHUB_SHA\}/);
  assert.match(deploymentTemplate, /berryhill\.dev\/deployment-revision: \{\{ \.Values\.deploymentRevision \| default \.Values\.image\.tag \| quote \}\}/);
  assert.match(deploymentTemplate, /image: "\{\{ \.Values\.image\.repository \}\}:\{\{ \.Values\.image\.tag \}\}"/);
});

test("Helm defaults preserve local chart behavior when workflow overrides are absent", () => {
  assert.match(values, /repository: ghcr\.io\/berryhill\/bd-site-app/);
  assert.match(values, /tag: 0\.0\.56/);
  assert.match(values, /pullPolicy: IfNotPresent/);
  assert.match(values, /deploymentRevision: ""/);
  assert.match(deploymentTemplate, /default \.Values\.image\.tag/);
});

test("single-replica ReadWriteOnce deployments replace pods without overlapping volume mounts", () => {
  assert.match(values, /replicaCount:\s*1/);
  assert.match(values, /accessMode:\s*ReadWriteOnce/);
  assert.match(deploymentTemplate, /strategy:[\s\S]*type:\s*Recreate/);
  assert.doesNotMatch(deploymentTemplate, /type:\s*RollingUpdate/);
  assert.doesNotMatch(deploymentTemplate, /rollingUpdate:/);
  assert.doesNotMatch(deploymentTemplate, /podAffinity:/);
});

test("deployment workflow fails closed on missing or mismatched revision inputs", () => {
  assert.match(workflow, /if \[ -z "\$\{IMAGE_TAG\}" \]; then[\s\S]*GITHUB_SHA is required for main deployments[\s\S]*exit 1/);
  assert.match(workflow, /if \[ -z "\$\{IMAGE_TAG\}" \]; then[\s\S]*build-push image-tag output is required for deployment[\s\S]*exit 1/);
  assert.match(workflow, /if \[ "\$\{IMAGE_TAG\}" != "\$\{GITHUB_SHA\}" \]; then[\s\S]*does not match GitHub revision[\s\S]*exit 1/);
});

console.log(`PASS ${passed} FAIL ${failed}`);

if (failed > 0) {
  process.exitCode = 1;
}
