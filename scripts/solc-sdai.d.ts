declare module 'solc-sdai' {
  const compiler: { version(): string; compile(input: string): string };
  export default compiler;
}
