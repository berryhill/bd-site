export function archivePageLinks(postCount: number, pageSize: number) {
  const lastPage = Math.max(1, Math.ceil(postCount / pageSize));
  return Array.from({ length: lastPage }, (_, index) => {
    const page = index + 1;
    return { page, href: page === 1 ? "/posts/" : `/posts/page/${page}/` };
  });
}
