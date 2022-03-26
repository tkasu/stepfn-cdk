from aws_lambda_powertools import Logger

logger = Logger(service="hello")


def handler(event, context):
    logger.debug(event)
    if "name" in event:
        name = event["name"]
        return f"hello {name}"
    else:
        return "hello for the uknown"