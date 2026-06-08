# Edge AI Model Conversion Guide

Because modern Windows Python environments (Python 3.12/3.13) have upgraded to NumPy 2.0+, the legacy `tensorflowjs_converter` utility may crash with `AttributeError: module 'numpy' has no attribute 'object'`.

To successfully convert your `bilstm_exercise_classifier.h5` into the TensorFlow.js WebGL format for zero-latency Edge AI, simply run this snippet in **Google Colab** (which natively uses a compatible Python 3.10 environment):

## Step-by-Step

1. Open [Google Colab](https://colab.research.google.com/) and create a new notebook.
2. Upload your `bilstm_exercise_classifier.h5` file to the Colab session storage.
3. Run the following cell:

```python
!pip install "numpy<1.24" tensorflowjs
!mkdir -p tfjs_model
!tensorflowjs_converter --input_format keras bilstm_exercise_classifier.h5 tfjs_model/
```

4. Download the generated `model.json` and `.bin` files from the `tfjs_model` folder.
5. Place these downloaded files into your repository at:
   `frontend/public/model/`

Once placed there, the React frontend will automatically load them and your system will be fully functioning with zero-latency Edge AI inference!
