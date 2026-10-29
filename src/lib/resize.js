// Shrinks a picked photo before upload: phones produce 4–12MB files, the backend accepts up to 4MB.
export async function resizeImage(file, max = 1600, quality = 0.85) {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('เปิดไฟล์รูปนี้ไม่ได้ ลองบันทึกเป็น JPG หรือ PNG ก่อน'))
      el.src = url
    })
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
    const width = Math.round(img.naturalWidth * scale)
    const height = Math.round(img.naturalHeight * scale)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d').drawImage(img, 0, 0, width, height)
    return { dataUrl: canvas.toDataURL('image/jpeg', quality), width, height }
  } finally {
    URL.revokeObjectURL(url)
  }
}
