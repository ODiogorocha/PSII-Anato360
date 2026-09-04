import inspect

# Verbose:
# - 0: nenhuma mensagem
# - 1: Mensagens de erro
# - 2: Todas as mensagens


def printError(text, verbose = 1, force_log=False):
        if force_log or verbose >= 1:
            caller = inspect.currentframe().f_back
            obj = caller.f_locals.get("self")

            if obj:
                name = (f"(\033[93m"f"{obj.__class__.__name__}"f"\033[0m)\t")
            else:
                name = ""

            print(f"[\033[31mX\033[m]\t{name}{text}")

def printSuccess(text, verbose = 1, force_log=False):
        if force_log or verbose == 2:
            caller = inspect.currentframe().f_back
            obj = caller.f_locals.get("self")

            if obj:
                name = (f"(\033[93m"f"{obj.__class__.__name__}"f"\033[0m)\t")
            else:
                name = ""

            print(f"[\033[32mV\033[m]\t{name}{text}")