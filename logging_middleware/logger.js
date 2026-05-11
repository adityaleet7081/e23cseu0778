const ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJlMjNjc2V1MDc3OEBiZW5uZXR0LmVkdS5pbiIsImV4cCI6MTc3ODQ3OTkxMiwiaWF0IjoxNzc4NDc5MDEyLCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiZDBhNzE1OTQtZTE5Zi00MjJmLWIxNmItMDdkNGU2ZDYyYTcxIiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoiYWRpdHlhIHByYXRhcCBzaW5naCIsInN1YiI6IjkzYjJmYmU5LTI2M2YtNGNiOC04M2Y4LTlhOTIyZjczMThiMiJ9LCJlbWFpbCI6ImUyM2NzZXUwNzc4QGJlbm5ldHQuZWR1LmluIiwibmFtZSI6ImFkaXR5YSBwcmF0YXAgc2luZ2giLCJyb2xsTm8iOiJlMjNjc2V1MDc3OCIsImFjY2Vzc0NvZGUiOiJUZkR4Z3IiLCJjbGllbnRJRCI6IjkzYjJmYmU5LTI2M2YtNGNiOC04M2Y4LTlhOTIyZjczMThiMiIsImNsaWVudFNlY3JldCI6InRweHNhdHp3dnVudmF0VWcifQ.TFgEsbJl-EXFPHn9-jf3P4B1RP7cM3TTyHiXvT8h_CA";

async function Log(stack, level, package_name, message) {
    try {
        const response = await fetch("http://4.224.186.213/evaluation-service/logs", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${ACCESS_TOKEN}`
            },
            body: JSON.stringify({
                stack: stack,
                level: level,
                package: package_name,
                message: message
            })
        });
        const data = await response.json();
        console.log(`[LOG SUCCESS] ${level.toUpperCase()} - ${message}`, data);
        return data;
    } catch (error) {
        console.error(`[LOG FAILED] ${message}`, error.message);
    }
}

module.exports = { Log };