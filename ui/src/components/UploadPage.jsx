import { useState, useCallback, useEffect } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    LinearProgress,
    Chip,
    IconButton,
    Alert,
    TablePagination,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button
} from '@mui/material';
import {
    FileText,
    Newspaper,
    CheckCircle,
    Clock,
    AlertCircle,
    RefreshCw,
    Trash2
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const UploadPage = ({ 
  apiEndpoint, 
  apiKey, 
  processingStatus, 
  setProcessingStatus, 
  processingStatusLoaded, 
  setProcessingStatusLoaded 
}) => {
    const [annualReports, setAnnualReports] = useState([]);
    const [newsArticles, setNewsArticles] = useState([]);
    const [isDraggingReports, setIsDraggingReports] = useState(false);
    const [isDraggingNews, setIsDraggingNews] = useState(false);
    const [isUploadingReports, setIsUploadingReports] = useState(false);
    const [isUploadingNews, setIsUploadingNews] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        // Load processing status if not already loaded and API credentials are available
        if (!processingStatusLoaded && apiEndpoint && apiEndpoint.trim() && apiKey && apiKey.trim()) {
            fetchProcessingStatus();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handle drag and drop for annual reports
    const handleReportsDragOver = useCallback((e) => {
        e.preventDefault();
        if (!isUploadingReports) {
            setIsDraggingReports(true);
        }
    }, [isUploadingReports]);

    const handleReportsDragLeave = useCallback((e) => {
        e.preventDefault();
        if (!isUploadingReports) {
            setIsDraggingReports(false);
        }
    }, [isUploadingReports]);

    const handleReportsDrop = useCallback((e) => {
        e.preventDefault();
        setIsDraggingReports(false);

        const files = Array.from(e.dataTransfer.files);
        const validFiles = files.filter(file =>
            file.type === 'application/pdf' ||
            file.name.toLowerCase().endsWith('.pdf')
        );

        if (validFiles.length !== files.length) {

        }

        setIsUploadingReports(true);
        validFiles.forEach(file => {
            // Generate UUID suffix and create new filename
            const uuid = uuidv4().split('-')[0]; // Use first part of UUID for brevity
            const fileExtension = file.name.split('.').pop();
            const baseName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
            const newFileName = `${baseName}_${uuid}.${fileExtension}`;
            
            const newReport = {
                id: Date.now() + Math.random(),
                name: newFileName,
                originalName: file.name,
                size: file.size,
                uploadStatus: 'uploading',
                uploadProgress: 0,
                processingStatus: 'pending',
                uploadedAt: new Date(),
                file: file
            };

            setAnnualReports(prev => [...prev, newReport]);
            uploadFile(file, newReport.id, 'reports', newFileName);
        });
        setTimeout(() => setIsUploadingReports(false), 3000);
    }, []);

    // Handle drag and drop for news articles
    const handleNewsDragOver = useCallback((e) => {
        e.preventDefault();
        if (!isUploadingNews) {
            setIsDraggingNews(true);
        }
    }, [isUploadingNews]);

    const handleNewsDragLeave = useCallback((e) => {
        e.preventDefault();
        if (!isUploadingNews) {
            setIsDraggingNews(false);
        }
    }, [isUploadingNews]);

    const handleNewsDrop = useCallback((e) => {
        e.preventDefault();
        setIsDraggingNews(false);

        const files = Array.from(e.dataTransfer.files);
        const validFiles = files.filter(file =>
            file.type.startsWith('text/') ||
            file.name.toLowerCase().endsWith('.txt') ||
            file.name.toLowerCase().endsWith('.md') ||
            file.name.toLowerCase().endsWith('.json')
        );

        if (validFiles.length !== files.length) {

        }

        setIsUploadingNews(true);
        validFiles.forEach(file => {
            // Generate UUID suffix and create new filename
            const uuid = uuidv4().split('-')[0]; // Use first part of UUID for brevity
            const fileExtension = file.name.split('.').pop();
            const baseName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
            const newFileName = `${baseName}_${uuid}.${fileExtension}`;
            
            const newArticle = {
                id: Date.now() + Math.random(),
                name: newFileName,
                originalName: file.name,
                size: file.size,
                uploadStatus: 'uploading',
                uploadProgress: 0,
                processingStatus: 'pending',
                uploadedAt: new Date(),
                file: file
            };

            setNewsArticles(prev => [...prev, newArticle]);
            uploadFile(file, newArticle.id, 'news', newFileName);
        });
        setTimeout(() => setIsUploadingNews(false), 3000);
    }, []);

    // Upload file using presigned URL
    const uploadFile = async (file, fileId, type, newFileName) => {
        const updateFile = (updates) => {
            if (type === 'reports') {
                setAnnualReports(prev => prev.map(f =>
                    f.id === fileId ? { ...f, ...updates } : f
                ));
            } else {
                setNewsArticles(prev => prev.map(f =>
                    f.id === fileId ? { ...f, ...updates } : f
                ));
            }
        };

        try {
            // Use API endpoint and key from props (fallback to environment)
            const endpoint = apiEndpoint || window.env?.API_GATEWAY_ENDPOINT || '';
            const key = apiKey || window.env?.API_GATEWAY_APIKEY || '';

            if (!endpoint || !key) {
                throw new Error('API endpoint or API key not configured');
            }

            // Step 1: Get presigned URL
            const presignedEndpoint = type === 'reports' ? 'presigned-url-pdf' : 'presigned-url-news';
            const presignedUrl = `https://${endpoint}/${presignedEndpoint}`;

            updateFile({ uploadProgress: 10 });

            const presignedResponse = await fetch(presignedUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': key
                },
                body: JSON.stringify({
                    fileName: newFileName,
                    fileSize: file.size,
                    contentType: file.type
                })
            });

            const presignedData = await presignedResponse.json();

            if (!presignedResponse.ok) {
                throw new Error(presignedData.error || 'Failed to get upload URL');
            }

            updateFile({ uploadProgress: 20 });

            // Step 2: Upload directly to S3 using presigned URL with progress tracking
            const uploadResponse = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();

                // Track upload progress
                xhr.upload.addEventListener('progress', (event) => {
                    if (event.lengthComputable) {
                        const percentComplete = Math.round((event.loaded / event.total) * 80) + 20; // 20-100%
                        updateFile({ uploadProgress: percentComplete });
                    }
                });

                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(xhr);
                    } else {
                        reject(new Error(`Upload failed with status ${xhr.status}`));
                    }
                });

                xhr.addEventListener('error', () => {
                    reject(new Error('Upload failed'));
                });

                xhr.open('PUT', presignedData.presignedUrl);
                xhr.setRequestHeader('Content-Type', presignedData.contentType);
                xhr.send(file);
            });

            // Upload completed successfully
            updateFile({
                uploadStatus: 'completed',
                uploadProgress: 100,
                processingStatus: 'completed'
            });

        } catch (error) {

            updateFile({
                uploadStatus: 'failed',
                processingStatus: 'failed',
                error: error.message
            });
        }
    };



    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDateTime = (isoString) => {
        if (!isoString) return '-';
        
        try {
            // Handle both old format and new ISO format
            if (isoString.includes('T') && isoString.includes('Z')) {
                // New ISO format - convert to local time
                const date = new Date(isoString);
                
                // Format time manually to get exact format
                let hours = date.getHours();
                const minutes = date.getMinutes().toString().padStart(2, '0');
                const ampm = hours >= 12 ? 'pm' : 'am';
                hours = hours % 12;
                hours = hours ? hours : 12; // 0 should be 12
                const timeStr = `${hours}:${minutes}${ampm}`;
                
                // Format date manually to get exact format
                const day = date.getDate();
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const month = monthNames[date.getMonth()];
                const year = date.getFullYear();
                const dateStr = `${day} ${month} ${year}`;
                
                return `${timeStr}, ${dateStr}`;
            } else {
                // Old format - return as is
                return isoString;
            }
        } catch (error) {

            return isoString;
        }
    };

    const fetchProcessingStatus = async () => {
        if (!apiEndpoint || !apiEndpoint.trim() || !apiKey || !apiKey.trim()) {
            console.error('API endpoint or API key not configured');
            return;
        }

        setIsRefreshing(true);
        try {
            const response = await fetch(`https://${apiEndpoint}/processing-status`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey
                }
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setProcessingStatus(data.data || []);
                setProcessingStatusLoaded(true);
                setPage(0); // Reset to first page when refreshing
            } else {
                console.error('Failed to fetch processing status:', data);
            }
        } catch (error) {
            console.error('Error fetching processing status:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    const deleteAllProcessingRecords = async () => {
        if (!apiEndpoint || !apiEndpoint.trim() || !apiKey || !apiKey.trim()) {
            console.error('API endpoint or API key not configured');
            return;
        }

        setIsDeleting(true);
        try {
            const response = await fetch(`https://${apiEndpoint}/processing-status`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey
                }
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setProcessingStatus([]);
                setPage(0);
                console.log('All processing records deleted successfully');
            } else {
                console.error('Failed to delete processing records:', data);
            }
        } catch (error) {
            console.error('Error deleting processing records:', error);
        } finally {
            setIsDeleting(false);
            setDeleteDialogOpen(false);
        }
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const getStatusChip = (uploadStatus, processingStatus, error) => {
        if (uploadStatus === 'uploading') {
            return <Chip 
                icon={<Clock size={16} />} 
                label="Uploading" 
                color="info" 
                size="small" 
                title="File is being transferred to secure cloud storage"
            />;
        }
        if (uploadStatus === 'failed' || processingStatus === 'failed') {
            return <Chip
                icon={<AlertCircle size={16} />}
                label="Failed"
                color="error"
                size="small"
                title={error || "Upload failed"}
            />;
        }
        if (uploadStatus === 'completed') {
            return <Chip 
                icon={<CheckCircle size={16} />} 
                label="Upload Complete" 
                color="success" 
                size="small" 
                title="File successfully uploaded to cloud storage"
            />;
        }
        return <Chip 
            icon={<Clock size={16} />} 
            label="Pending" 
            color="default" 
            size="small" 
            title="Waiting to start upload"
        />;
    };

    const DropZone = ({
        onDragOver,
        onDragLeave,
        onDrop,
        isDragging,
        isUploading,
        title,
        description,
        icon,
        acceptedFormats
    }) => (
        <Card
            sx={{
                border: isDragging && !isUploading ? '2px dashed #FF9900' : '2px dashed #E9ECEF',
                backgroundColor: isDragging && !isUploading ? '#FFF3E0' : '#F8F9FA',
                transition: isUploading ? 'none' : 'all 0.3s ease',
                cursor: isUploading ? 'not-allowed' : 'pointer',
                borderRadius: 3,
                height: '260px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
                opacity: isUploading ? 0.7 : 1,
                '&:hover': !isUploading ? {
                    borderColor: 'primary.main',
                    backgroundColor: '#FFF3E0',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.12)'
                } : {}
            }}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            <CardContent sx={{
                textAlign: 'center',
                py: 2,
                px: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%'
            }}>
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1.2,
                    maxWidth: '90%'
                }}>
                    <Box sx={{
                        p: 2,
                        borderRadius: '50%',
                        backgroundColor: isDragging ? 'primary.main' : '#E9ECEF',
                        color: isDragging ? 'white' : 'text.secondary',
                        transition: 'all 0.3s ease'
                    }}>
                        {icon}
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '1.1rem' }}>
                        {title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{
                        maxWidth: '100%',
                        lineHeight: 1.3,
                        textAlign: 'center',
                        fontSize: '0.85rem',
                        mb: 1
                    }}>
                        {description}
                    </Typography>
                    <Typography variant="body2" sx={{ 
                        fontSize: '0.8rem', 
                        fontWeight: 500,
                        textAlign: 'center',
                        color: 'text.secondary'
                    }}>
                        {acceptedFormats}
                    </Typography>
                    {isUploading && (
                        <Typography variant="caption" sx={{ 
                            fontSize: '0.75rem', 
                            color: 'warning.main',
                            mt: 1,
                            fontStyle: 'italic'
                        }}>
                            Upload in progress...
                        </Typography>
                    )}
                </Box>
            </CardContent>
        </Card>
    );

    const CombinedFileTable = ({ annualReports, newsArticles, title }) => {
        const allFiles = [
            ...annualReports.map(file => ({ ...file, fileType: 'Financial Document' })),
            ...newsArticles.map(file => ({ ...file, fileType: 'News File' }))
        ];

        return (
            <Card sx={{
                mt: 3,
                border: '1px solid #E9ECEF',
                borderRadius: 3,
                boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
                backgroundColor: 'white'
            }}>
                <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>
                        {title} ({allFiles.length})
                    </Typography>
                    {allFiles.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                            No files uploaded yet
                        </Typography>
                    ) : (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Type</TableCell>
                                        <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>File Name</TableCell>
                                        <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Size</TableCell>
                                        <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Progress</TableCell>
                                        <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Status</TableCell>
                                    </TableRow>
                                </TableHead>
                            <TableBody>
                                {allFiles.map((file) => (
                                    <TableRow key={file.id} sx={{ '&:hover': { backgroundColor: '#F8F9FA' } }}>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box sx={{ color: 'primary.main' }}>
                                                    {file.fileType === 'Financial Document' ? <FileText size={16} /> : <Newspaper size={16} />}
                                                </Box>
                                                <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                                                    {file.fileType}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box>
                                                <Typography 
                                                    variant="body2" 
                                                    sx={{ fontWeight: 500, color: 'text.primary' }}
                                                    title={`Upload name: ${file.name}`}
                                                >
                                                    {file.originalName || file.name}
                                                </Typography>
                                                {file.originalName && (
                                                    <Typography 
                                                        variant="caption" 
                                                        sx={{ color: 'text.secondary', fontSize: '0.7rem' }}
                                                    >
                                                        → {file.name}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {formatFileSize(file.size)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{ minWidth: 100 }}>
                                            {file.uploadStatus === 'uploading' ? (
                                                <Box>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={file.uploadProgress}
                                                        sx={{ mb: 0.5, '& .MuiLinearProgress-bar': { backgroundColor: 'primary.main' } }}
                                                    />
                                                    <Typography variant="caption" color="text.secondary">
                                                        {Math.round(file.uploadProgress)}%
                                                    </Typography>
                                                </Box>
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">
                                                    Complete
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {getStatusChip(file.uploadStatus, file.processingStatus, file.error)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </CardContent>
        </Card>
        );
    };

    return (
        <Box>
            {/* Header Section */}
            <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 4 }}>
                Document Upload
            </Typography>

            <Alert
                severity="warning"
                sx={{
                    mb: 4,
                    backgroundColor: '#FFF8E1',
                    border: '1px solid #FFD54F',
                    color: '#5D4037',
                    '& .MuiAlert-icon': { color: '#FF8F00' }
                }}
            >
                <Typography variant="body2" sx={{ color: '#5D4037' }}>
                    Ready to analyze your business documents! Upload annual reports (PDF) and news articles (text files) to discover key entities, relationships, and insights through our AI-powered knowledge graph system.
                </Typography>
            </Alert>

            {/* Main Content - Two Column Layout */}
            <Box sx={{
                display: 'flex',
                gap: 4
            }}>
                {/* Left Column - Annual Reports */}
                <Box sx={{
                    flex: 1,
                    pr: 2
                }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, color: 'text.primary' }}>
                        Annual Reports & Financial Documents
                    </Typography>

                    <DropZone
                        onDragOver={handleReportsDragOver}
                        onDragLeave={handleReportsDragLeave}
                        onDrop={handleReportsDrop}
                        isDragging={isDraggingReports}
                        isUploading={isUploadingReports}
                        title="Drop Financial Documents Here"
                        description="Upload annual reports, 10-K filings, and other structured financial documents"
                        icon={<FileText size={32} />}
                        acceptedFormats="PDF Files Only (.pdf)"
                    />

                </Box>

                {/* Right Column - News Articles */}
                <Box sx={{
                    flex: 1,
                    pl: 2
                }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, color: 'text.primary' }}>
                        News Articles & Press Releases
                    </Typography>

                    <DropZone
                        onDragOver={handleNewsDragOver}
                        onDragLeave={handleNewsDragLeave}
                        onDrop={handleNewsDrop}
                        isDragging={isDraggingNews}
                        isUploading={isUploadingNews}
                        title="Drop News Files Here"
                        description="Upload news articles, press releases, and market reports"
                        icon={<Newspaper size={32} />}
                        acceptedFormats="Text Files (.txt, .md, .json)"
                    />
                </Box>
            </Box>

            {/* Combined Upload Status Table */}
            <CombinedFileTable
                annualReports={annualReports}
                newsArticles={newsArticles}
                title="Upload Status"
            />

            {/* Processing Status Table */}
            <Box sx={{ mt: 4 }}>
                <Card sx={{
                    border: '1px solid #E9ECEF',
                    borderRadius: 3,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
                    backgroundColor: 'white'
                }}>
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                Processing Status ({processingStatus.length})
                                {isRefreshing && !processingStatusLoaded && (
                                    <Typography component="span" variant="body2" sx={{ ml: 1, color: 'text.secondary', fontStyle: 'italic' }}>
                                        Loading...
                                    </Typography>
                                )}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <IconButton
                                    onClick={() => setDeleteDialogOpen(true)}
                                    disabled={isDeleting || processingStatus.length === 0}
                                    sx={{ 
                                        color: 'error.main',
                                        '&:hover': { backgroundColor: 'error.light', color: 'white' },
                                        '&:disabled': { color: 'text.disabled' }
                                    }}
                                    title="Delete all processing records"
                                >
                                    <Trash2 size={20} />
                                </IconButton>
                                <IconButton
                                    onClick={fetchProcessingStatus}
                                    disabled={isRefreshing}
                                    sx={{ 
                                        color: 'primary.main',
                                        '&:hover': { backgroundColor: 'primary.light', color: 'white' }
                                    }}
                                    title="Refresh processing status"
                                >
                                    <RefreshCw 
                                        size={20} 
                                        style={{ 
                                            animation: isRefreshing ? 'spin 1s linear infinite' : 'none' 
                                        }} 
                                    />
                                </IconButton>
                            </Box>
                        </Box>
                        {processingStatus.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                                {isRefreshing && !processingStatusLoaded 
                                    ? 'Loading processing status...' 
                                    : 'No processing records found. Click refresh to load latest status.'
                                }
                            </Typography>
                        ) : (
                            <>
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Type</TableCell>
                                                <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>File Name</TableCell>
                                                <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Started</TableCell>
                                                <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Ended</TableCell>
                                                <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Progress</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {processingStatus
                                                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                                .map((record) => (
                                                <TableRow key={record.id} sx={{ '&:hover': { backgroundColor: '#F8F9FA' } }}>
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Box sx={{ color: 'primary.main' }}>
                                                                {record.file_type === 'financial_document' ? <FileText size={16} /> : <Newspaper size={16} />}
                                                            </Box>
                                                            <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                                                                {record.file_type === 'financial_document' ? 'Financial Document' : 'News File'}
                                                            </Typography>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                                                            {record.file_name}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" color="text.secondary">
                                                            {formatDateTime(record.datetime_started)}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" color="text.secondary">
                                                            {formatDateTime(record.datetime_ended)}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ minWidth: 120 }}>
                                                        {record.progress_percentage >= 100 ? (
                                                            <Chip 
                                                                icon={<CheckCircle size={16} />} 
                                                                label="Completed" 
                                                                color="success" 
                                                                size="small" 
                                                            />
                                                        ) : (
                                                            <Box>
                                                                <LinearProgress
                                                                    variant="determinate"
                                                                    value={record.progress_percentage}
                                                                    sx={{ mb: 0.5, '& .MuiLinearProgress-bar': { backgroundColor: 'primary.main' } }}
                                                                />
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {record.progress_percentage}%
                                                                </Typography>
                                                            </Box>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                <TablePagination
                                    rowsPerPageOptions={[5, 10, 25, 50]}
                                    component="div"
                                    count={processingStatus.length}
                                    rowsPerPage={rowsPerPage}
                                    page={page}
                                    onPageChange={handleChangePage}
                                    onRowsPerPageChange={handleChangeRowsPerPage}
                                    sx={{
                                        borderTop: '1px solid #E9ECEF',
                                        mt: 2
                                    }}
                                />
                            </>
                        )}
                    </CardContent>
                </Card>
            </Box>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                aria-labelledby="delete-dialog-title"
                aria-describedby="delete-dialog-description"
            >
                <DialogTitle id="delete-dialog-title">
                    Delete All Processing Records
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="delete-dialog-description">
                        Are you sure you want to delete all processing records? This action cannot be undone.
                        This will remove {processingStatus.length} record{processingStatus.length !== 1 ? 's' : ''} from the processing status table.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={() => setDeleteDialogOpen(false)}
                        disabled={isDeleting}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={deleteAllProcessingRecords}
                        color="error"
                        variant="contained"
                        disabled={isDeleting}
                        startIcon={isDeleting ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={16} />}
                    >
                        {isDeleting ? 'Deleting...' : 'Delete All'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default UploadPage;