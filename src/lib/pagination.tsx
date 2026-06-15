export const getPaginationRange = (currentPage: number, totalPages: number) => {
    const delta = 2; // Số lượng trang hiển thị ở 2 bên trang hiện tại
    const range = [];
    const rangeWithDots = [];
    let l;
  
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }
  
    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l > 2) {
          rangeWithDots.push("...");
        }
      }
      rangeWithDots.push(i);
      l = i;
    }
  
    return rangeWithDots;
  };