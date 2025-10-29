FROM public.ecr.aws/lambda/python:3.13

# Copy the custom connectionsinsights library
COPY connectionsinsights/ ${LAMBDA_TASK_ROOT}/connectionsinsights

# Copy requirements.txt
COPY requirements.txt ${LAMBDA_TASK_ROOT}

# Install the specified packages
RUN pip install -r requirements.txt

# Copy function code
COPY index.py ${LAMBDA_TASK_ROOT}

# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
CMD [ "index.lambda_handler" ]