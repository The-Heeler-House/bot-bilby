const tagRegex = /{([\w\d\s\.()=:*!.'",@£$%^&\-_\\/;`~[\]|<>+#]+)}/g;

export function escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}