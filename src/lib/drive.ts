export interface DriveLinkInfo {
  isDrive: boolean;
  isFolder: boolean;
  isFile: boolean;
  fileId: string | null;
  folderId: string | null;
  directUrl: string;
}

/**
 * Phân tích và chuyển đổi URL Google Drive thành link trực tiếp (direct link) để hiển thị trong thẻ img.
 * Dùng API Thumbnail của Google Drive (sz=w600) nhằm tối ưu tốc độ tải và giảm thiểu lỗi phân quyền/chặn referrer.
 *
 * @param url URL của file hoặc thư mục Google Drive
 */
export function parseDriveLink(url: string | null | undefined): DriveLinkInfo {
  const result: DriveLinkInfo = {
    isDrive: false,
    isFolder: false,
    isFile: false,
    fileId: null,
    folderId: null,
    directUrl: '',
  };

  if (!url) return result;

  const trimmed = url.trim();
  result.directUrl = trimmed;

  const isGDrive = trimmed.includes('drive.google.com') || trimmed.includes('google.com/drive');
  if (!isGDrive) {
    // Nếu không phải Google Drive thì giữ nguyên làm directUrl
    return result;
  }

  result.isDrive = true;

  // Kiểm tra xem có phải link thư mục (folder) không
  const isFolder = trimmed.includes('/folders/') || trimmed.includes('/drive/folders/');
  if (isFolder) {
    result.isFolder = true;
    // Trích xuất folderId
    const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]{28,44})/);
    if (folderMatch && folderMatch[1]) {
      result.folderId = folderMatch[1];
    } else {
      const driveFolderMatch = trimmed.match(/\/drive\/folders\/([a-zA-Z0-9_-]{28,44})/);
      if (driveFolderMatch && driveFolderMatch[1]) {
        result.folderId = driveFolderMatch[1];
      }
    }
    return result;
  }

  // Trích xuất file ID từ các định dạng link chia sẻ của Google Drive
  // Định dạng 1: .../file/d/FILE_ID/view...
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    result.fileId = fileDMatch[1];
    result.isFile = true;
  } else {
    // Định dạng 2: ...?id=FILE_ID hoặc ...&id=FILE_ID
    const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idParamMatch && idParamMatch[1]) {
      result.fileId = idParamMatch[1];
      result.isFile = true;
    }
  }

  if (result.isFile && result.fileId) {
    // Sử dụng endpoint thumbnail của Google Drive thay vì docs.google.com/uc?export=view
    // Ưu điểm: Tải nhanh hơn, ít bị chặn CORS/Referrer và bypass được giới hạn băng thông tải file gốc.
    result.directUrl = `https://drive.google.com/thumbnail?id=${result.fileId}&sz=w600`;
  }

  return result;
}
