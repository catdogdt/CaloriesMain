class ConfigException(Exception):
    pass


class CannotSetValue(ConfigException):
    pass


class InvalidPath(ConfigException):
    pass


class CannotDeduceType(ConfigException):
    pass


class CannotResolveError(ConfigException):
    pass


class NoBackup(ConfigException):
    pass
