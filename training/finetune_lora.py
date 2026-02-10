from transformers import AutoTokenizer, AutoModelForCausalLM, TrainingArguments, Trainer
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
import datasets
import torch
from config.settings import settings

BASE_MODEL = settings.MEDGEMMA_MODEL_PATH
tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL, trust_remote_code=True)

# load base model with k-bit/prepare for lora
model = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL,
    trust_remote_code=True,
    device_map="auto",
    torch_dtype=torch.float16
)
model = prepare_model_for_kbit_training(model)

# LoRA config (example values)
lora_config = LoraConfig(
    r=8,
    lora_alpha=32,
    target_modules=["q_proj", "v_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM"
)

model = get_peft_model(model, lora_config)
model.print_trainable_parameters()

# dataset should provide 'input_ids' and 'labels' for causal LM
ds = datasets.load_from_disk("my_finetune_dataset")

training_args = TrainingArguments(
    per_device_train_batch_size=2,
    gradient_accumulation_steps=8,
    warmup_steps=20,
    num_train_epochs=3,
    learning_rate=2e-4,
    fp16=True,
    logging_steps=10,
    output_dir="outputs/pediscreen_lora",
    save_total_limit=3,
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=ds["train"],
    eval_dataset=ds["validation"],
    tokenizer=tokenizer,
)

trainer.train()
# save adapters only (smaller)
model.save_pretrained("outputs/pediscreen_lora")
