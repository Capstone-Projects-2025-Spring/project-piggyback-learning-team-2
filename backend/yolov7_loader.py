import torch
import sys
from pathlib import Path
from torch.serialization import add_safe_globals
from yolov7.models.yolo import Model

def load_yolov7_model(weights_path):
    """Load YOLOv7 model with proper handling for PyTorch 2.6"""
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

    # Create module alias for pickle to find the class
    if 'models' not in sys.modules:
        import yolov7.models as models_module
        sys.modules['models'] = models_module

    try:
        # Add the Model class to the safe globals list
        # This is required for PyTorch 2.6's security features
        add_safe_globals([Model])

        try:
            # First try with weights_only=True and using add_safe_globals
            checkpoint = torch.load(weights_path, map_location=device, weights_only=True)
        except Exception as e1:
            print(f"Failed to load with weights_only=True: {str(e1)}")
            # If that fails, fall back to weights_only=False (less secure, but compatible)
            checkpoint = torch.load(weights_path, map_location=device, weights_only=False)
            print("Successfully loaded model with weights_only=False")

        # Handle different checkpoint formats
        if isinstance(checkpoint, dict):
            if 'model' in checkpoint:
                state_dict = checkpoint['model'].float().state_dict()
            elif 'state_dict' in checkpoint:
                state_dict = checkpoint['state_dict']
            else:
                state_dict = checkpoint
        else:
            # If checkpoint is already a model
            model = checkpoint.float().to(device)
            model.eval()
            return model, device

        # Create model with proper configuration
        model = Model(cfg='yolov7/cfg/deploy/yolov7.yaml', ch=3, nc=80).to(device)

        # Load state dict with strict=False to handle missing keys
        model.load_state_dict(state_dict, strict=False)
        model.eval()

        print("Model loaded successfully")
        return model, device

    except Exception as e:
        print(f"Error loading model: {str(e)}")
        raise
    finally:
        # Clean up the temporary module mapping
        if 'models' in sys.modules and sys.modules['models'] is not sys.modules.get('yolov7.models', None):
            del sys.modules['models']
