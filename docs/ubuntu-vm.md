# Run Internity on the Ubuntu VM

Docker, k3s, and Argo CD are already installed. Argo CD deploys whatever is on `master` in [hasinesrak/internity](https://github.com/hasinesrak/internity) at `infra/k8s/overlays/production`. Sync is manual. Pushing to `master` runs `.github/workflows/ci.yml`: lint and test in parallel, then a build, then one Docker job that pushes immutable `sha-<commit>` images and commits those tags. A Sync rolls them out. It does not build images itself.

The VM address used below is `192.168.0.103`. The login user is `esrak`. Run the VM commands over SSH. In a new shell, point `kubectl` at k3s:

```bash
export KUBECONFIG=$HOME/.kube/config
```

## Run it again

The first setup is already on this VM. Argo CD, the images, the secret, the ingress, and both disks are in place. The app is down because these workloads were scaled to zero:

- `deploy/web`
- `deploy/staff`
- `deploy/backend-public`
- `deploy/backend-staff`
- `statefulset/mongo`

Argo CD shows `internity` as OutOfSync for those five objects only when the only drift is the replica count. Git asks for 1 replica. The cluster has 0. A Sync starts the app at the image tags currently in Git. It does not rebuild images or recreate the secret.

1. Open [http://argocd.192.168.0.103.sslip.io](http://argocd.192.168.0.103.sslip.io).
2. Open the `internity` application.
3. Choose **Sync**, then **Synchronize**.

From the VM, the same result is:

```bash
export KUBECONFIG=$HOME/.kube/config
kubectl -n internity scale statefulset/mongo --replicas=1
kubectl -n internity scale deploy/web deploy/staff deploy/backend-public deploy/backend-staff --replicas=1
kubectl -n internity rollout status statefulset/mongo
kubectl -n internity get pods
```

Wait until `mongo-0` is `Running` and the four deployments are `1/1`. Then open the sites in section 6. Traefik answers with `503` until those pods are ready.

Leave the namespace, `internity-secrets`, and the `uploads-data` and `data-mongo-0` disks in place. Automated sync is off, so the next time you want it running you Sync or scale again.

Do the later sections only when something changed:

| Change | What to run |
|---|---|
| Env file (`JWT_SECRET`, allowlist, admin, mail, or drafting key) | `bash infra/scripts/apply-cluster-env.sh`, then restart `backend-public`, `backend-staff`, and `staff` |
| Application code | Rebuild and import the image in section 3, then restart that deployment |
| Ingress host or cookie setting | Edit the manifest, push to `master`, and Sync |

## 1. Point Argo CD at this VM

Git already tracks `https://github.com/hasinesrak/internity.git` at `master`. The ingress hosts, cookie setting, upload claim, and Mongo probe match this VM:

| Setting | Value |
|---|---|
| Intern site | `internity.192.168.0.103.sslip.io` |
| Public API | `api.192.168.0.103.sslip.io` |
| Staff site | `staff.192.168.0.103.sslip.io` |
| Staff API | `staff-api.192.168.0.103.sslip.io` |
| `COOKIE_SECURE` | `"false"` while the sites are plain HTTP |
| `TRUST_PROXY` | `"true"` so the staff allowlist sees the browser address Traefik forwards |
| `uploads-data` | `ReadWriteOnce` |
| Mongo readiness | TCP on port `mongo` |

Change those files if this VM's address changes, then push to `master`. k3s local-path can provision `ReadWriteOnce`. Both API pods are on this one node, so they can share that claim.

The Argo CD application is not part of the overlay. After you pull, register it again so the project and the repo URL are the ones in Git:

```bash
cd /home/esrak/internity
git pull
kubectl apply -f infra/argocd/internity.yaml
```

## 2. Create the cluster secret from the env files

Argo CD does not create this secret, and it does not read `.env`. The pods read `internity-secrets`. This script fills that secret from the env files already on the machine:

1. `.env`
2. `apps/backend/.env` (a non-empty value wins)
3. `apps/staff/.env` (a non-empty `STAFF_ALLOWED_IPS` wins)

```bash
cd /home/esrak/internity
bash infra/scripts/apply-cluster-env.sh
```

The script copies `JWT_SECRET`, `STAFF_ALLOWED_IPS`, `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `GROQ_API_KEY`. It prints the key names only. A localhost Mongo URL is stored as `mongodb://mongo:27017/internity`, because the pods reach Mongo through the `mongo` Service.

`JWT_SECRET` must be at least 32 characters. `ADMIN_PASSWORD`, when set, must be at least 8 characters and include a letter and a number. The staff process creates that admin once, when no active admin exists. Leave `STAFF_ALLOW_PRIVATE` unset.

After you change an env file, run the script again, then:

```bash
kubectl -n internity rollout restart deploy/backend-staff deploy/staff deploy/backend-public
```

## 3. Publish images, or build them on the VM

A push to `master` publishes three `linux/amd64` images, tagged `sha-<commit>`, then commits those names into `infra/k8s/overlays/production/kustomization.yaml`. The Docker Hub repositories have to be public, because the node has no pull secret. Sync after that commit. The site images bake `VITE_API_URL` at build time. CI uses `http://api.192.168.0.103.sslip.io` and `http://staff-api.192.168.0.103.sslip.io` unless the `WEB_API_URL` and `STAFF_API_URL` repository variables override them.

Until that publish has run, the overlay still points at the images imported on the VM:

- `docker.io/internity/internity-backend:sha-dev`
- `docker.io/internity/internity-web:sha-dev`
- `docker.io/internity/internity-staff:sha-dev`

If the node cannot pull, build the exact name and tag from the overlay and import them. k3s does not see images that exist only in Docker. The site build args must match the ingress hosts. The commands below match the overlay while its tag is still `sha-dev`.

```bash
cd /home/esrak/internity

docker build -f apps/backend/Dockerfile \
  -t docker.io/internity/internity-backend:sha-dev .

docker build -f apps/web/Dockerfile \
  --build-arg VITE_API_URL=http://api.192.168.0.103.sslip.io \
  -t docker.io/internity/internity-web:sha-dev .

docker build -f apps/staff/Dockerfile \
  --build-arg VITE_API_URL=http://staff-api.192.168.0.103.sslip.io \
  -t docker.io/internity/internity-staff:sha-dev .

docker save docker.io/internity/internity-backend:sha-dev | sudo k3s ctr images import -
docker save docker.io/internity/internity-web:sha-dev | sudo k3s ctr images import -
docker save docker.io/internity/internity-staff:sha-dev | sudo k3s ctr images import -
```

Build one image at a time if the VM runs out of memory. After a rebuild, import again and restart the deployments in the command at the end of step 2.

## 4. Publish Traefik on the VM address

```bash
kubectl -n kube-system patch svc traefik --type merge \
  -p '{"spec":{"externalIPs":["192.168.0.103"]}}'
```

Port 80 on `192.168.0.103` then reaches the ingress. UFW on this VM already allows 22, 80, and 443.

## 5. Register the app and sync it

```bash
kubectl apply -f /home/esrak/internity/infra/argocd/internity.yaml
```

Open Argo CD at [http://argocd.192.168.0.103.sslip.io](http://argocd.192.168.0.103.sslip.io). The user is `admin`. The first password is:

```bash
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath='{.data.password}' | base64 -d; echo
```

If that address does not load, from the VM run `kubectl -n argocd port-forward svc/argocd-server 8080:443` and open `https://localhost:8080`.

In the `internity` application, choose **Sync**. Automated sync is off, so every later push to `master` needs another Sync. A Sync also sets each deployment back to one replica.

## 6. Open the app

Wait until the pods are `Running`:

```bash
kubectl -n internity get pods
```

`mongo-0` can take a minute on the first start.

| Site | URL |
|---|---|
| Intern site | http://internity.192.168.0.103.sslip.io |
| Public API | http://api.192.168.0.103.sslip.io/health |
| Staff site | http://staff.192.168.0.103.sslip.io |
| Staff API | http://staff-api.192.168.0.103.sslip.io/health |

Sign in on the staff site with `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `apps/backend/.env`. Staff sign-in works from an address in `STAFF_ALLOWED_IPS`.

`RESEND_API_KEY` and `GROQ_API_KEY` are copied onto the secret when those lines are set in the env files. Mail and drafting stay off when the lines are empty.

## When a pod stays down

| What you see | What to do |
|---|---|
| `uploads-data` is `Pending` | Confirm the claim is `ReadWriteOnce`, delete the pending claim, and Sync again. Leave the claim alone once it is `Bound`. |
| `ImagePullBackOff` | The overlay tag must match an image the node can see. Public Docker Hub tags pull on Sync. For a local tag, `sudo k3s ctr images ls` must show that same name and tag. |
| `backend-staff` restarts | `kubectl -n internity logs deploy/backend-staff`. The usual cause is a missing `STAFF_ALLOWED_IPS` or a `JWT_SECRET` shorter than 32 characters. |
| Staff sign-in is rejected | Add that computer's LAN address to `STAFF_ALLOWED_IPS` in `apps/backend/.env` or `apps/staff/.env`, run `bash infra/scripts/apply-cluster-env.sh`, and restart `backend-staff` and `staff`. |
| The page loads and the session disappears | Set `COOKIE_SECURE` to `"false"`, push, and Sync. |
| The site calls `localhost` | Rebuild `internity-web` or `internity-staff` with the sslip API URL, import, and restart that deployment. |
| `mongo-0` stays unready | The readiness probe is a TCP check on port `mongo`. The database volume is `data-mongo-0`. Leave that volume in place. |
