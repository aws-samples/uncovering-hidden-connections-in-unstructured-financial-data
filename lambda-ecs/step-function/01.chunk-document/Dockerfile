FROM public.ecr.aws/lambda/python:3.12

RUN mkdir connectionsinsights

COPY requirements.txt ${LAMBDA_TASK_ROOT}
COPY ./connectionsinsights/ ${LAMBDA_TASK_ROOT}/connectionsinsights
COPY index.py ${LAMBDA_TASK_ROOT}

RUN python3 -m pip install -r requirements.txt

CMD ["index.lambda_handler"]