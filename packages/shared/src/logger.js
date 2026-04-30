export function log(level, message, context = {}) {
    const payload = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...context,
    };
    const line = JSON.stringify(payload);
    if (level === "error") {
        console.error(line);
        return;
    }
    if (level === "warn") {
        console.warn(line);
        return;
    }
    console.log(line);
}
//# sourceMappingURL=logger.js.map