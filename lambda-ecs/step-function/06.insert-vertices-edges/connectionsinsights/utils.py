
def clean_name(name):
    suffixes = ["CO", "INC", "LTD", "LLP", "LIMITED", "COM"]  # Add more if needed
    prefixes = ["MR", "DR", "PROF", "MS", "MISS", "MDM", "MRS"]  # Add more if needed
    punctuations = [",",".","-","\""] # Add more if needed
    for punctuation in punctuations:
        name = name.replace(punctuation, ' ').strip()
    
    name_array = name.split()
    name_array = [part for part in name_array if part.upper() not in suffixes]
    name_array = [part for part in name_array if part.upper() not in prefixes]

    return " ".join(name_array).strip()   