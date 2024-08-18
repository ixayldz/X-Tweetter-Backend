const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const s3Client = new S3Client({ region: 'your-region' });

const uploadFile = async (file) => {
  const params = {
    Bucket: 'your-bucket-name',
    Key: file.filename,
    Body: file.content,
  };

  try {
    const data = await s3Client.send(new PutObjectCommand(params));
    console.log('File uploaded successfully:', data);
    return data;
  } catch (err) {
    console.error('Error uploading file:', err);
    throw err;
  }
};
