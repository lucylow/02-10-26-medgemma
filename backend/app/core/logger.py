# backend/app/core/logger.py
from loguru import logger
import sys

# simple log config
logger.remove()
logger.add(sys.stderr, level="INFO", format="{time} | {level} | {message}")
