import requests
from aws_lambda_powertools import Logger

logger = Logger(service="get-quote")

def handler(event, context):
    resp = requests.get("https://api.quotable.io/random")
    resp.raise_for_status()
    
    resp_content = resp.json()
    logger.debug(resp_content)

    return {"quote": resp_content["content"]}
