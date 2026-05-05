const DB_NAME = 'text2cam_db';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject('IndexedDB error: ' + event.target.errorCode);
        };
    });
}

async function savePhoto(photoBlob, caption = '') {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const photoRecord = {
            data: photoBlob,
            caption: caption,
            timestamp: Date.now()
        };
        const request = store.add(photoRecord);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject('Lỗi khi lưu ảnh');
    });
}

async function getAllPhotos() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject('Lỗi khi lấy ảnh');
    });
}
