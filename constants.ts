
export const CODE_SNIPPETS = {
  FACTORIAL: `int factorial(int n) {
    // 基准情形 (Base Case)
    if (n <= 1) return 1;

    // 递归步骤 (Recursive Step)
    int prev = factorial(n - 1);
    return n * prev;
}`,
  POWER: `int power(int x, int n) {
    // 基准情形 (Base Case)
    if (n == 0) return 1;

    // 递归步骤
    int prev = power(x, n - 1);
    return x * prev;
}`,
  FIBONACCI: `int fibonacci(int n) {
    // 基准情形 (Base Cases)
    if (n == 0) return 0;
    if (n == 1) return 1;

    // 递归分支 (Branching)
    int left = fibonacci(n - 1);
    int right = fibonacci(n - 2);
    
    return left + right;
}`,
  PALINDROME: `bool isPalindrome(string s) {
    // 基准情形 (Base Case)
    if (s.length() <= 1) return true;
    
    // 检查首尾字符
    if (s[0] != s[s.length()-1]) 
        return false;

    // 递归检查子串
    return isPalindrome(s.substr(1, s.length()-2));
}`
};

export const INITIAL_MEMORY_SIZE = 64;