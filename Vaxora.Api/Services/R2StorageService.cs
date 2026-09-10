using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.AspNetCore.Http;

namespace Vaxora.Api.Services;

public interface IR2StorageService
{
    Task<string> UploadFileAsync(IFormFile file, string folderPrefix, string customFileName = "");
    Task<string> GetPresignedUrlAsync(string objectKey, int expiryMinutes = 60);
    Task<bool> DeleteFileAsync(string objectKey);
}

public class R2StorageService : IR2StorageService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<R2StorageService> _logger;
    private readonly IAmazonS3? _s3Client;
    private readonly string _bucketName;
    private readonly string _publicUrl;

    public R2StorageService(IConfiguration configuration, ILogger<R2StorageService> logger)
    {
        _configuration = configuration;
        _logger = logger;

        var accountId = _configuration["CloudflareR2:AccountId"];
        var accessKey = _configuration["CloudflareR2:AccessKeyId"];
        var secretKey = _configuration["CloudflareR2:SecretAccessKey"];
        _bucketName = _configuration["CloudflareR2:BucketName"] ?? "vaxora-docs";
        _publicUrl = _configuration["CloudflareR2:PublicUrl"] ?? "";

        if (!string.IsNullOrEmpty(accountId) && !string.IsNullOrEmpty(accessKey) && !string.IsNullOrEmpty(secretKey))
        {
            var credentials = new BasicAWSCredentials(accessKey, secretKey);
            var s3Config = new AmazonS3Config
            {
                ServiceURL = $"https://{accountId}.r2.cloudflarestorage.com",
                ForcePathStyle = true
            };
            _s3Client = new AmazonS3Client(credentials, s3Config);
        }
        else
        {
            _logger.LogWarning("Cloudflare R2 credentials are not fully configured. Storing locally or mock key.");
        }
    }

    public async Task<string> UploadFileAsync(IFormFile file, string folderPrefix, string customFileName = "")
    {
        if (file == null || file.Length == 0)
        {
            throw new ArgumentException("Uploaded file is empty or null.");
        }

        // Validate max size (10MB)
        if (file.Length > 10 * 1024 * 1024)
        {
            throw new InvalidOperationException("File size exceeds 10MB limit.");
        }

        // Validate allowed extensions
        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".pdf", ".webp" };
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(extension))
        {
            throw new InvalidOperationException($"File type '{extension}' is not allowed. Allowed types: JPG, PNG, WEBP, PDF.");
        }

        var fileName = string.IsNullOrEmpty(customFileName) 
            ? $"{Guid.NewGuid()}{extension}" 
            : $"{customFileName}{extension}";

        var objectKey = $"{folderPrefix.TrimEnd('/')}/{fileName}";

        if (_s3Client == null)
        {
            // If R2 credentials are not provided, fallback to local uploads directory for smooth dev experience
            var localUploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", folderPrefix);
            Directory.CreateDirectory(localUploadsDir);
            var localPath = Path.Combine(localUploadsDir, fileName);
            using var stream = new FileStream(localPath, FileMode.Create);
            await file.CopyToAsync(stream);
            return $"/uploads/{folderPrefix}/{fileName}";
        }

        using var memoryStream = new MemoryStream();
        await file.CopyToAsync(memoryStream);
        memoryStream.Position = 0;

        var putRequest = new PutObjectRequest
        {
            BucketName = _bucketName,
            Key = objectKey,
            InputStream = memoryStream,
            ContentType = file.ContentType,
            DisablePayloadSigning = true
        };

        await _s3Client.PutObjectAsync(putRequest);
        _logger.LogInformation("Successfully uploaded file to R2: {ObjectKey}", objectKey);

        if (!string.IsNullOrEmpty(_publicUrl))
        {
            return $"{_publicUrl.TrimEnd('/')}/{objectKey}";
        }

        return objectKey;
    }

    public async Task<string> GetPresignedUrlAsync(string objectKey, int expiryMinutes = 60)
    {
        if (string.IsNullOrEmpty(objectKey)) return string.Empty;

        // If it's already a full URL or local path
        if (objectKey.StartsWith("http://") || objectKey.StartsWith("https://") || objectKey.StartsWith("/uploads"))
        {
            return objectKey;
        }

        if (_s3Client == null)
        {
            return objectKey;
        }

        var request = new GetPreSignedUrlRequest
        {
            BucketName = _bucketName,
            Key = objectKey,
            Expires = DateTime.UtcNow.AddMinutes(expiryMinutes)
        };

        return await Task.FromResult(_s3Client.GetPreSignedURL(request));
    }

    public async Task<bool> DeleteFileAsync(string objectKey)
    {
        if (string.IsNullOrEmpty(objectKey) || _s3Client == null) return false;

        try
        {
            var deleteRequest = new DeleteObjectRequest
            {
                BucketName = _bucketName,
                Key = objectKey
            };
            await _s3Client.DeleteObjectAsync(deleteRequest);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete file from R2: {ObjectKey}", objectKey);
            return false;
        }
    }
}
