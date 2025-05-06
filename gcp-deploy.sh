docker run --rm -it -w /workspace -v $PWD:/workspace -v ~/.config/gcloud:/root/.config/gcloud gcr.io/google.com/cloudsdktool/google-cloud-cli bash

gcloud run deploy --source . --region asia-northeast1 --project dreamboothy --platform managed --allow-unauthenticated comfy-pr
