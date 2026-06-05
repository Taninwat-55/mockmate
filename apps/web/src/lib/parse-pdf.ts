// Client-side PDF → plain text. Runs entirely in the browser: the file is never
// uploaded — only the extracted text leaves the page (saved via a Server Action).
// pdfjs is loaded with a dynamic import so it stays out of the server bundle and
// is only fetched when a user actually picks a file.

export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist")

  // Resolve the worker as a bundled asset. `new URL(..., import.meta.url)` is the
  // form both Turbopack and Webpack understand, so no manual /public copy needed.
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString()

  const data = await file.arrayBuffer()
  const loadingTask = pdfjs.getDocument({ data })
  const doc = await loadingTask.promise

  try {
    const pages: string[] = []
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber)
      const content = await page.getTextContent()
      // `items` is (TextItem | TextMarkedContent)[]; only TextItem has `str`.
      const pageText = content.items
        .flatMap((item) => ("str" in item ? [item.str] : []))
        .join(" ")
      pages.push(pageText)
    }
    return pages.join("\n").replace(/\s+/g, " ").trim()
  } finally {
    // Destroying the loading task also tears down the worker.
    await loadingTask.destroy()
  }
}
