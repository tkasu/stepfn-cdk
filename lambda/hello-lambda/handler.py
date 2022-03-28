from aws_lambda_powertools import Logger

logger = Logger(service="hello")


def handler(event, context):
    logger.debug(event)

    if not "name" in event:
        raise ValueError("No name property in the event.")
    if not "quote" in event:
        raise ValueError("No quote property in the event.")

    name = event["name"]
    quote = event["quote"]
    return f"Hello {name}. {quote}"
