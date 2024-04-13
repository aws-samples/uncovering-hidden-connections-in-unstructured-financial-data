FROM public.ecr.aws/amazonlinux/amazonlinux:latest

RUN yum install -y python3 python3-pip
RUN mkdir connectionsinsights

COPY requirements.txt ${LAMBDA_TASK_ROOT}
COPY ./connectionsinsights/ ${LAMBDA_TASK_ROOT}/connectionsinsights
COPY index.py ${LAMBDA_TASK_ROOT}

RUN python3 -m pip install -r requirements.txt

CMD ["python3", "index.py"]