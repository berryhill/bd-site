/* eslint-disable no-console */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

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

function renderChart(setValues = []) {
  const args = ["template", "bd-site", "./helm", "-f", "./helm/values.yaml"];
  for (const value of setValues) {
    args.push("--set", value);
  }
  return execFileSync("helm", args, {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    encoding: "utf8",
  });
}

function renderedDocument(renderedChart, kind) {
  return renderedChart
    .split(/^---\s*$/m)
    .find(document => new RegExp(`^kind: ${kind}$`, "m").test(document));
}

const workflow = readRepoFile(".github/workflows/deploy.yaml");
const ciWorkflow = readRepoFile(".github/workflows/ci.yml");
const values = readRepoFile("helm/values.yaml");
const pvcTemplate = readRepoFile("helm/templates/pvc.yaml");
const deploymentTemplate = readRepoFile("helm/templates/deployment.yaml");
const dockerfile = readRepoFile("Dockerfile");
const serviceAccountPath = new URL("../helm/templates/serviceaccount.yaml", import.meta.url);
const serviceAccountTemplate = existsSync(serviceAccountPath) ? readFileSync(serviceAccountPath, "utf8") : "";

test("production deployments are serialized without cancelling an in-flight release", () => {
  assert.match(workflow, /concurrency:\s+group:\s*bd-site-production\s+cancel-in-progress:\s*false/);
});

test("pull request CI runs the repository tests before linting and building", () => {
  const helmSetupIndex = ciWorkflow.indexOf("uses: azure/setup-helm@v4");
  const testIndex = ciWorkflow.indexOf("run: pnpm test");
  const lintIndex = ciWorkflow.indexOf("run: pnpm run lint");
  const buildIndex = ciWorkflow.indexOf("run: pnpm run build");

  assert.ok(helmSetupIndex >= 0, "PR CI must install Helm for chart render tests");
  assert.ok(testIndex > helmSetupIndex, "PR CI must install Helm before running tests");
  assert.ok(testIndex >= 0, "PR CI must run pnpm test");
  assert.ok(lintIndex > testIndex, "PR CI must run tests before linting");
  assert.ok(buildIndex > testIndex, "PR CI must run tests before building");
});

test("filesystem defaults render the retained PVC and mount it at the live posts path", () => {
  assert.match(values, /contentStorage:[\s\S]*filesystem:[\s\S]*pvc:[\s\S]*create:\s*true/);
  assert.match(values, /pvc:[\s\S]*mount:\s*true/);
  assert.match(values, /existingClaim:\s*bd-site-posts-pvc/);
  assert.match(values, /preserveOnDelete:\s*true/);
  assert.match(pvcTemplate, /helm\.sh\/resource-policy/);

  const rendered = renderChart();
  const pvc = renderedDocument(rendered, "PersistentVolumeClaim");
  const deployment = renderedDocument(rendered, "Deployment");

  assert.ok(pvc, "default render must create the posts PVC");
  assert.ok(deployment, "default render must include the deployment");
  assert.match(pvc, /name: bd-site-posts-pvc/);
  assert.match(pvc, /helm\.sh\/resource-policy: keep/);
  assert.match(deployment, /name: posts-content[\s\S]*mountPath: \/app\/src\/data\/blog/);
  assert.match(deployment, /persistentVolumeClaim:[\s\S]*claimName: bd-site-posts-pvc/);
  assert.doesNotMatch(deployment, /emptyDir:/);
});

test("preserved-but-unmounted mode retains the PVC without any content volume", () => {
  const rendered = renderChart(["contentStorage.filesystem.pvc.mount=false"]);
  const pvc = renderedDocument(rendered, "PersistentVolumeClaim");
  const deployment = renderedDocument(rendered, "Deployment");

  assert.ok(pvc, "preserved mode must continue rendering the posts PVC");
  assert.ok(deployment, "preserved mode must include the deployment");
  assert.match(pvc, /name: bd-site-posts-pvc/);
  assert.match(pvc, /helm\.sh\/resource-policy: keep/);
  assert.doesNotMatch(deployment, /posts-content/);
  assert.doesNotMatch(deployment, /\/app\/src\/data\/blog/);
  assert.doesNotMatch(deployment, /emptyDir:/);
});

test("an externally managed existing claim can be mounted without rendering a PVC", () => {
  const rendered = renderChart([
    "contentStorage.filesystem.pvc.create=false",
    "contentStorage.filesystem.pvc.existingClaim=operator-managed-posts",
  ]);
  const pvc = renderedDocument(rendered, "PersistentVolumeClaim");
  const deployment = renderedDocument(rendered, "Deployment");

  assert.equal(pvc, undefined);
  assert.ok(deployment, "external-claim mode must include the deployment");
  assert.match(deployment, /persistentVolumeClaim:[\s\S]*claimName: operator-managed-posts/);
  assert.match(deployment, /mountPath: \/app\/src\/data\/blog/);
});

test("main deployment builds and pushes a SHA tag while exporting its immutable digest", () => {
  assert.match(workflow, /if: github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /IMAGE_TAG="\$\{GITHUB_SHA\}"/);
  assert.match(workflow, /image-tag: \$\{\{ steps\.image\.outputs\.image_tag \}\}/);
  assert.match(workflow, /image-digest: \$\{\{ steps\.build\.outputs\.digest \}\}/);
  assert.match(workflow, /uses:\s*docker\/build-push-action@v6/);
  assert.match(workflow, /id:\s*build/);
  assert.match(workflow, /push:\s*true/);
  assert.match(workflow, /tags:\s*\$\{\{ env\.DOCKER_REGISTRY \}\}\/\$\{\{ env\.DOCKER_ORG \}\}\/\$\{\{ env\.DOCKER_IMAGE \}\}:\$\{\{ steps\.image\.outputs\.image_tag \}\}/);
  assert.doesNotMatch(workflow, /docker build/);
  assert.doesNotMatch(workflow, /docker push/);
  assert.doesNotMatch(workflow, /DOCKER_TAG:\s*0\.0\.56/);
});

test("production build delivers DOT_ENV as a required secret and fails closed on public build values", () => {
  assert.match(workflow, /secrets:\s*\|\s*"dot_env=\$\{\{ secrets\.DOT_ENV \}\}"/);
  assert.match(workflow, /no-cache:\s*true/);
  assert.doesNotMatch(workflow, /build-args:[\s\S]*DOT_ENV=/);
  assert.match(dockerfile, /--mount=type=secret,id=dot_env,required=true/);
  assert.match(dockerfile, /base64 -d \/run\/secrets\/dot_env > \.env/);
  assert.match(dockerfile, /test -s \.env/);
  assert.match(dockerfile, /node scripts\/verifyBuiltPublicEnv\.mjs \.env dist/);
  assert.match(dockerfile, /trap 'rm -f \.env' EXIT/);
});

test("preflight and Helm deploy the exact build digest while retaining SHA revision metadata", () => {
  assert.match(workflow, /IMAGE_DIGEST:\s*\$\{\{ needs\.build-push\.outputs\.image-digest \}\}/);
  assert.match(workflow, /IMAGE_TAG:\s*\$\{\{ needs\.build-push\.outputs\.image-tag \}\}/);
  assert.match(workflow, /FULL_IMAGE="\$\{DOCKER_REGISTRY\}\/\$\{DOCKER_ORG\}\/\$\{DOCKER_IMAGE\}@\$\{IMAGE_DIGEST\}"/);
  assert.match(workflow, /--set image\.digest="\$\{IMAGE_DIGEST\}"/);
  assert.match(workflow, /--set image\.tag="\$\{IMAGE_TAG\}"/);
  assert.match(workflow, /--set deploymentRevision="\$\{GITHUB_SHA\}"/);
  assert.match(workflow, /DEPLOYED_IMAGE=.*jsonpath=.*containers\[0\]\.image/);
  assert.match(workflow, /\[ "\$\{DEPLOYED_IMAGE\}" != "\$\{FULL_IMAGE\}" \]/);
  assert.match(deploymentTemplate, /berryhill\.dev\/deployment-revision: \{\{ \.Values\.deploymentRevision \| default \.Values\.image\.tag \| quote \}\}/);
  assert.match(deploymentTemplate, /image: "\{\{ \.Values\.image\.repository \}\}\{\{ if \.Values\.image\.digest \}\}@\{\{ \.Values\.image\.digest \}\}\{\{ else \}\}:\{\{ \.Values\.image\.tag \}\}\{\{ end \}\}"/);
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

test("deployment workflow fails closed on missing or mismatched image identity", () => {
  assert.match(workflow, /if \[ -z "\$\{IMAGE_TAG\}" \]; then[\s\S]*GITHUB_SHA is required for main deployments[\s\S]*exit 1/);
  assert.match(workflow, /if \[ -z "\$\{IMAGE_TAG\}" \] \|\| \[ "\$\{IMAGE_TAG\}" != "\$\{GITHUB_SHA\}" \]; then/);
  assert.match(workflow, /Build image tag is missing or does not match GitHub revision/);
  assert.match(workflow, /Build output is not a valid sha256 digest/);
});

test("Helm templates contain only renderable chart files", () => {
  const templateFiles = readdirSync(new URL("../helm/templates/", import.meta.url));
  const invalid = templateFiles.filter(
    file => !file.startsWith("_") && !/\.(yaml|yml|tpl|txt)$/.test(file)
  );
  assert.deepEqual(invalid, []);
});

test("deployment uses a dedicated service account with one durable GHCR pull secret", () => {
  assert.match(values, /serviceAccount:[\s\S]*name:\s*bd-site/);
  assert.match(values, /imagePullSecret:[\s\S]*name:\s*ghcr-pull/);
  assert.match(serviceAccountTemplate, /kind:\s*ServiceAccount/);
  assert.match(serviceAccountTemplate, /name:\s*\{\{ \.Values\.serviceAccount\.name \}\}/);
  assert.match(serviceAccountTemplate, /imagePullSecrets:[\s\S]*name:\s*\{\{ \.Values\.imagePullSecret\.name \}\}/);
  assert.match(deploymentTemplate, /serviceAccountName:\s*\{\{ \.Values\.serviceAccount\.name \}\}/);
});

test("temporary pull credentials are env-bound, file-backed, promoted only after preflight", () => {
  assert.match(workflow, /GHCR_USERNAME:\s*\$\{\{ secrets\.GHCR_USERNAME \}\}/);
  assert.match(workflow, /GHCR_TOKEN:\s*\$\{\{ secrets\.GHCR_TOKEN \}\}/);
  assert.doesNotMatch(workflow, /--docker-(?:username|password)=/);
  assert.doesNotMatch(workflow, /if \[ -z "\$\{\{ secrets\.GHCR_/);
  assert.match(workflow, /chmod 600 "\$\{DOCKER_CONFIG_PATH\}"/);
  assert.match(workflow, /--type=kubernetes\.io\/dockerconfigjson/);
  assert.match(workflow, /--from-file=\.dockerconfigjson="\$\{DOCKER_CONFIG_PATH\}"/);
  assert.match(workflow, /GHCR_PREFLIGHT_SECRET:\s*ghcr-pull-preflight/);

  const temporarySecretIndex = workflow.indexOf('secret generic "${GHCR_PREFLIGHT_SECRET}"');
  const preflightIndex = workflow.indexOf("Pre-pull exact image on every cluster node");
  const durableSecretIndex = workflow.indexOf('secret generic "${GHCR_PULL_SECRET}"');
  const helmIndex = workflow.indexOf("helm upgrade --install bd-site");
  assert.ok(temporarySecretIndex >= 0, "temporary pull secret must be created");
  assert.ok(preflightIndex > temporarySecretIndex, "preflight must use the temporary secret");
  assert.ok(durableSecretIndex > preflightIndex, "durable pull secret must be reconciled after preflight");
  assert.ok(helmIndex > durableSecretIndex, "Helm must run after durable credential promotion");
});

test("preflight covers every node and always cleans all temporary resources", () => {
  assert.match(workflow, /PREFLIGHT_NAME:\s*bd-site-image-preflight/);
  assert.match(workflow, /kubectl delete daemonset "\$\{PREFLIGHT_NAME\}" -n "\$\{KUBE_NAMESPACE\}" --ignore-not-found/);
  assert.match(workflow, /kind:\s*DaemonSet/);
  assert.match(workflow, /imagePullSecrets:[\s\S]*name:\s*\$\{GHCR_PREFLIGHT_SECRET\}/);
  assert.match(workflow, /tolerations:\s+- operator:\s*Exists/);
  assert.match(workflow, /NODE_COUNT=.*kubectl get nodes/);
  assert.match(workflow, /"\$\{DESIRED\}" != "\$\{NODE_COUNT\}"/);
  assert.match(workflow, /"\$\{READY\}" != "\$\{NODE_COUNT\}"/);
  assert.match(workflow, /name:\s*Cleanup preflight resources/);
  assert.match(workflow, /if:\s*always\(\)/);
  assert.match(workflow, /kubectl delete secret "\$\{GHCR_PREFLIGHT_SECRET\}" -n "\$\{KUBE_NAMESPACE\}" --ignore-not-found/);
  assert.match(workflow, /rm -f "\$\{DOCKER_CONFIG_PATH\}"/);
});

test("post-rollout public checks are bounded and roll back to the verified previous revision", () => {
  assert.match(workflow, /PREVIOUS_REVISION=.*helm history bd-site -n "\$\{KUBE_NAMESPACE\}"/);
  assert.match(workflow, /for path in "\/" "\/posts\/" "\/rss\.xml" "\/sitemap\.xml" "\/sitemap-posts\.xml"/);
  assert.match(workflow, /curl -fsS --retry 3 --retry-delay 2 --connect-timeout 10 --max-time 30/);
  assert.match(workflow, /helm rollback bd-site "\$\{PREVIOUS_REVISION\}" -n "\$\{KUBE_NAMESPACE\}" --wait --timeout 3m/);
  assert.match(workflow, /kubectl rollout status deployment\/bd-site -n "\$\{KUBE_NAMESPACE\}" --timeout=180s/);
  assert.doesNotMatch(workflow, /curl -fsS https:\/\/berryhill\.dev\/posts\/ >\/dev\/null \|\| true/);
  assert.match(
    workflow,
    /grep -Fq 'https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-SSLPRQNE9Q'/
  );
  assert.match(workflow, /Production homepage is missing the configured GA4 script tag/);
});

test("Helm rollout is atomic and all namespaced operations specify the production namespace", () => {
  assert.match(workflow, /KUBE_NAMESPACE:\s*default/);
  assert.match(workflow, /helm upgrade --install bd-site \.\/helm[\s\S]*-n "\$\{KUBE_NAMESPACE\}"[\s\S]*--atomic[\s\S]*--wait[\s\S]*--timeout 3m/);
  const kubectlLines = workflow.split("\n").filter(line => line.includes("kubectl "));
  const clusterScopedLines = kubectlLines.filter(line => line.includes("kubectl get nodes"));
  const namespacedLines = kubectlLines.filter(line => !line.includes("kubectl get nodes"));
  assert.equal(clusterScopedLines.length, 1);
  for (const line of namespacedLines) {
    assert.match(line, /-n "\$\{KUBE_NAMESPACE\}"/, `missing namespace: ${line.trim()}`);
  }
});

test("diagnostics are bounded and preserve rollout failures", () => {
  assert.match(workflow, /kubectl get pods -n "\$\{KUBE_NAMESPACE\}" -l app=bd-site -o wide \|\| true/);
  assert.match(workflow, /kubectl describe -n "\$\{KUBE_NAMESPACE\}" "\$\{POD_NAME\}" \|\| true/);
  assert.match(
    workflow,
    /kubectl logs -n "\$\{KUBE_NAMESPACE\}" "\$\{POD_NAME\}" --all-containers=true --tail=120 \|\| true/
  );
  assert.match(
    workflow,
    /kubectl logs -n "\$\{KUBE_NAMESPACE\}" "\$\{POD_NAME\}" --all-containers=true --previous --tail=120 \|\| true/
  );
  assert.match(workflow, /tail -n (?:60|80) \|\| true/);
  assert.doesNotMatch(workflow, /kubectl logs[^\n]*--follow/);
});

console.log(`PASS ${passed} FAIL ${failed}`);

if (failed > 0) {
  process.exitCode = 1;
}
