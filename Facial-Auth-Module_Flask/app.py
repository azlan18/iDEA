from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import base64
import json
import numpy as np
import cv2
from deepface import DeepFace
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Convert base64 to image
def base64_to_image(base64_string):
    # Remove the data:image/jpeg;base64, prefix if present
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]
    
    # Decode base64 string to image
    img_data = base64.b64decode(base64_string)
    nparr = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img

@app.route('/api/verify', methods=['POST'])
def verify_face():
    try:
        # Get the image and reference image from the request
        data = request.json
        if not data or 'image' not in data or 'referenceImage' not in data:
            return jsonify({'error': 'Image and reference image are required'}), 400
        
        # Get the images
        image_base64 = data['image']
        reference_base64 = data['referenceImage']
        
        # Convert base64 to images
        img = base64_to_image(image_base64)
        reference_img = base64_to_image(reference_base64)
        
        # Save images temporarily
        input_path = "input_face.jpg"
        reference_path = "reference_face.jpg"
        cv2.imwrite(input_path, img)
        cv2.imwrite(reference_path, reference_img)
        
        # Verify face using DeepFace
        try:
            result = DeepFace.verify(
                img1_path=reference_path,
                img2_path=input_path,
                model_name="VGG-Face",  # You can try different models: VGG-Face, Facenet, OpenFace, DeepFace, etc.
                distance_metric="cosine"  # You can try different metrics: cosine, euclidean, euclidean_l2
            )
            
            # Remove temporary files
            os.remove(input_path)
            os.remove(reference_path)
            
            threshold = 0.65  # Default threshold for VGG-Face with cosine
            verified = result["verified"]
            distance = result["distance"]
            

            print("Distance: ", distance)
            print("Threshold: ", threshold)
            print("Verified: ", verified)


            return jsonify({
                'verified': verified,
                'distance': float(distance),
                'threshold': threshold
            })
            
        except Exception as e:
            # This might happen if no face is detected
            # Clean up temporary files in case of error
            if os.path.exists(input_path):
                os.remove(input_path)
            if os.path.exists(reference_path):
                os.remove(reference_path)
                
            return jsonify({
                'verified': False,
                'error': 'Face detection error',
                'details': str(e)
            }), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5005)



    