export function SiteFooter() {
  return (
    <footer className="border-t border-border mt-24 py-12">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-start gap-8">
        <div className="font-mono text-[10px] text-muted-foreground space-y-2 uppercase tracking-widest">
          <div>&copy; {new Date().getFullYear()} alsoright Labs</div>
          <div>실시간 소셜 디덕션 디베이트</div>
        </div>
        <div className="flex gap-8 font-mono text-[10px] uppercase text-muted-foreground">
          <a href="#" className="hover:text-foreground transition-colors">
            프로토콜
          </a>
          <a href="#" className="hover:text-foreground transition-colors">
            보안
          </a>
          <a href="#" className="hover:text-foreground transition-colors">
            터미널
          </a>
        </div>
      </div>
    </footer>
  );
}
