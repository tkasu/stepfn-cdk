from aws_lambda_powertools import Logger

logger = Logger(service="hello")


class NoNameException(Exception):
    pass


def handler(event, context):
    logger.debug(event)
    if not "name" in event:
        raise NoNameException("No name in event.")

    name = event["name"]
    return {"name": name.upper()}
