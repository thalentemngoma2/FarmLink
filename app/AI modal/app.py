import gradio as gr
from ultralytics import YOLO
from PIL import Image
import json
import numpy as np

model = YOLO("best.pt")  # your trained model

# -- Disease -> solution mapping (customise as needed) --
DISEASE_ADVICE = {
    "PepperBellHealthy": ("healthy", "No disease detected.", "Continue normal care.", "Regular watering and sunlight."),
    "PepperBellSpot": ("disease", "Pepper Bell Spot", "Apply copper-based fungicide.", "Avoid overhead watering; rotate crops."),
    "PotatoEarlyBlight": ("disease", "Early Blight on Potato", "Remove infected leaves; apply fungicide.", "Use disease-free seeds; rotate crops."),
    "PotatoHealthy": ("healthy", "No disease detected.", "Continue normal care.", "Ensure proper soil drainage."),
    "PotatoLateBlight": ("disease", "Late Blight on Potato", "Apply systemic fungicide immediately.", "Use resistant varieties; avoid wet leaves at night."),
    "TomatoBacterialSpot": ("disease", "Bacterial Spot on Tomato", "Remove affected leaves; apply copper spray.", "Avoid overhead watering; sterilise tools."),
    "TomatoEarlyBlight": ("disease", "Early Blight on Tomato", "Prune lower leaves; use fungicide.", "Crop rotation; mulch to prevent soil splash."),
    "TomatoHealthy": ("healthy", "No disease detected.", "Continue normal care.", "Consistent watering and fertilisation."),
    "TomatoLateBlight": ("disease", "Late Blight on Tomato", "Apply systemic fungicide; remove infected leaves.", "Avoid crowded plants; use resistant varieties."),
    "TomatoLeafMold": ("disease", "Leaf Mold on Tomato", "Increase ventilation; apply fungicide.", "Water at soil level; prune for airflow."),
    "TomatoMosaicVirus": ("disease", "Mosaic Virus on Tomato", "Remove and destroy infected plants.", "Control aphids; use virus-free seeds."),
    "TomatoSeptoriaLeafSpot": ("disease", "Septoria Leaf Spot on Tomato", "Prune infected leaves; apply fungicide.", "Mulch; avoid overhead watering."),
    "TomatoSpiderMitesTwoSpottedSpiderMite": ("disease", "Spider Mites on Tomato", "Spray with insecticidal soap or neem oil.", "Encourage natural predators (ladybugs)."),
    "TomatoTargetSpot": ("disease", "Target Spot on Tomato", "Apply copper-based fungicide.", "Rotate crops; remove plant debris."),
    "TomatoYellowLeafCurlVirus": ("disease", "Yellow Leaf Curl Virus on Tomato", "Remove infected plants; control whiteflies.", "Use resistant varieties; use row covers early."),
}

def detect(image):
    results = model(image)
    annotated = results[0].plot()

    # Find the highest confidence detection
    best_conf = 0
    best_class = "Healthy"
    for box in results[0].boxes:
        cls_name = model.names[int(box.cls)]
        conf = float(box.conf)
        if conf > best_conf:
            best_conf = conf
            best_class = cls_name

    # Get tailored advice or fallback to generic
    advice = DISEASE_ADVICE.get(best_class, None)
    if not advice:
        # Fallback: decide based on class name
        if "healthy" in best_class.lower():
            advice = ("healthy", "No disease detected.", "Continue normal care.", "Regular monitoring.")
        else:
            advice = ("disease", f"Detected: {best_class}", "Consult a local agricultural expert.", "Regular monitoring and proper crop rotation.")

    state, cause, solution, prevention = advice
    if best_conf > 0 and not ("healthy" in best_class.lower()):
        cause = f"{cause} (confidence {best_conf:.0%})"

    analysis = {
        "state": state,
        "cause": cause,
        "solution": solution,
        "preventiveTips": prevention,
    }

    # Return annotated image and JSON string of analysis
    return Image.fromarray(annotated), json.dumps(analysis)

iface = gr.Interface(
    fn=detect,
    inputs=gr.Image(type="pil"),
    outputs=[gr.Image(type="pil"), gr.Textbox(label="Analysis")],
    title="Plant Scanner",
    description="Upload a leaf image to detect diseases."
)

iface.launch(server_name="0.0.0.0", server_port=7860)