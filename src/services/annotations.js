const DB_NAME = 'QuranToolDB'
const DB_VERSION = 3
const STORE_NAME = 'annotations'

class AnnotationService {
    constructor() {
        this.db = null
        this.initPromise = this.initDB()
    }

    async initDB() {
        if (this.db) return this.db

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION)

            request.onerror = (event) => {
                console.error('IndexedDB error:', event.target.error)
                reject(event.target.error)
            }

            request.onsuccess = (event) => {
                this.db = event.target.result
                resolve(this.db)
            }

            request.onupgradeneeded = (event) => {
                const db = event.target.result
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
                    store.createIndex('surah', 'surah', { unique: false })
                    store.createIndex('pageId', 'pageId', { unique: false })
                }
                if (!db.objectStoreNames.contains('srs_data')) {
                    db.createObjectStore('srs_data', { keyPath: 'pageId' })
                }
            }
        })
    }

    async getAnnotation(id) {
        await this.initPromise
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly')
            const store = transaction.objectStore(STORE_NAME)
            const request = store.get(id)

            request.onsuccess = () => resolve(request.result || null)
            request.onerror = () => reject(request.error)
        })
    }

    async saveAnnotation(data) {
        await this.initPromise
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite')
            const store = transaction.objectStore(STORE_NAME)

            // Ensure timestamp
            const annotation = {
                ...data,
                updatedAt: Date.now()
            }
            if (!annotation.createdAt) {
                annotation.createdAt = Date.now()
            }

            const request = store.put(annotation)

            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
        })
    }

    async deleteAnnotation(id) {
        await this.initPromise
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite')
            const store = transaction.objectStore(STORE_NAME)
            const request = store.delete(id)

            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
        })
    }

    // Get all annotations for a specific Surah (optimization)
    async getAnnotationsForSurah(surah) {
        await this.initPromise
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly')
            const store = transaction.objectStore(STORE_NAME)
            const index = store.index('surah')
            const request = index.getAll(IDBKeyRange.only(surah))

            request.onsuccess = () => {
                // Return as map for easy lookup: { 'id': data }
                const map = {}
                request.result.forEach(item => {
                    map[item.id] = item
                })
                resolve(map)
            }
            request.onerror = () => reject(request.error)
        })
    }

    // Get all annotations for a specific Page
    async getAnnotationsForPage(pageId) {
        await this.initPromise
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly')
            const store = transaction.objectStore(STORE_NAME)
            const index = store.index('pageId')
            const request = index.getAll(IDBKeyRange.only(pageId))

            request.onsuccess = () => {
                const map = {}
                request.result.forEach(item => {
                    map[item.id] = item
                })
                resolve(map)
            }
            request.onerror = () => reject(request.error)
        })
    }
    // Get all annotations (for backup)
    async getAllAnnotations() {
        await this.initPromise
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly')
            const store = transaction.objectStore(STORE_NAME)
            const request = store.getAll()

            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
        })
    }

    // Clear all annotations (for restore)
    async clearAll() {
        await this.initPromise
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite')
            const store = transaction.objectStore(STORE_NAME)
            const request = store.clear()

            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
        })
    }
    // SRS Data Methods
    async getSRSData(pageId) {
        await this.initPromise
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['srs_data'], 'readonly')
            const store = transaction.objectStore('srs_data')
            const request = store.get(pageId)

            request.onsuccess = () => resolve(request.result || null)
            request.onerror = () => reject(request.error)
        })
    }

    async saveSRSData(pageId, data) {
        await this.initPromise
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['srs_data'], 'readwrite')
            const store = transaction.objectStore('srs_data')
            const request = store.put({ pageId, ...data })

            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
        })
    }

    async deleteSRSData(pageId) {
        await this.initPromise
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['srs_data'], 'readwrite')
            const store = transaction.objectStore('srs_data')
            const request = store.delete(pageId)

            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
        })
    }

    async getAllSRS() {
        await this.initPromise
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['srs_data'], 'readonly')
            const store = transaction.objectStore('srs_data')
            const request = store.getAll()

            request.onsuccess = () => {
                const map = {}
                request.result.forEach(item => {
                    map[item.pageId] = item
                })
                resolve(map)
            }
            request.onerror = () => reject(request.error)
        })
    }

    // Force close connection (for reset)
    close() {
        if (this.db) {
            this.db.close()
            this.db = null
        }
    }
}

export const annotationService = new AnnotationService()
