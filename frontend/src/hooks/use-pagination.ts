import * as React from 'react'

export function usePagination({ defaultPageSize = 10 }: { defaultPageSize?: number } = {}) {
  const [pageIndex, setPageIndex] = React.useState(0)
  const [pageSize, setPageSize] = React.useState(defaultPageSize)

  const onPageChange = React.useCallback((next: number) => {
    setPageIndex(next)
  }, [])

  const onPageSizeChange = React.useCallback((size: number) => {
    setPageIndex(0)
    setPageSize(size)
  }, [])

  return {
    pageIndex,
    pageSize,
    onPageChange,
    onPageSizeChange,
  }
}
