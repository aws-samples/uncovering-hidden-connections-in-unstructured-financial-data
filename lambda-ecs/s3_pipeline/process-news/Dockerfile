FROM public.ecr.aws/lambda/python:3.10

COPY ./connectionsinsights/ ${LAMBDA_TASK_ROOT}/connectionsinsights

COPY requirements.txt ${LAMBDA_TASK_ROOT}

RUN pip install -r requirements.txt

COPY index.py ${LAMBDA_TASK_ROOT}

CMD ["index.lambda_handler"]