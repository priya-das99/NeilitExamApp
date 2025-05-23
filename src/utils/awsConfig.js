import AWS from 'aws-sdk';

// Configure AWS using environment variables
AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

export const rekognition = new AWS.Rekognition();

export const compareFaces = async (sourceImage, targetImage) => {
  try {
    const params = {
      SourceImage: {
        Bytes: sourceImage
      },
      TargetImage: {
        Bytes: targetImage
      },
      SimilarityThreshold: 80 // Adjust this threshold as needed
    };

    const response = await rekognition.compareFaces(params).promise();
    return response;
  } catch (error) {
    console.error('AWS Rekognition Error:', error);
    throw error;
  }
}; 