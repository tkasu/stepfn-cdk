import os
import json

import boto3
import requests
from aws_lambda_powertools import Logger

logger = Logger(service="get-quote")


def main():
    s3_bucket = os.environ["S3_BUCKET"]
    s3_key = os.environ["S3_KEY"]

    resp = requests.get("https://api.quotable.io/random")
    resp.raise_for_status()

    resp_content = resp.json()
    logger.debug(resp_content)

    obj = {"quote": resp_content["content"]}

    s3_client = boto3.client("s3")
    resp = s3_client.put_object(
        Body=json.dumps(obj),
        Bucket=s3_bucket,
        Key=s3_key,
    )
    logger.debug(resp)


if __name__ == "__main__":
    main()
