const { Log } = require('../logging_middleware/logger');

const ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJlMjNjc2V1MDc3OEBiZW5uZXR0LmVkdS5pbiIsImV4cCI6MTc3ODQ4MzExNiwiaWF0IjoxNzc4NDgyMjE2LCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiODBhOTdmMTItNTY4Yi00ZTZlLTk5ZDQtN2MyODExZTllMWQ2IiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoiYWRpdHlhIHByYXRhcCBzaW5naCIsInN1YiI6IjkzYjJmYmU5LTI2M2YtNGNiOC04M2Y4LTlhOTIyZjczMThiMiJ9LCJlbWFpbCI6ImUyM2NzZXUwNzc4QGJlbm5ldHQuZWR1LmluIiwibmFtZSI6ImFkaXR5YSBwcmF0YXAgc2luZ2giLCJyb2xsTm8iOiJlMjNjc2V1MDc3OCIsImFjY2Vzc0NvZGUiOiJUZkR4Z3IiLCJjbGllbnRJRCI6IjkzYjJmYmU5LTI2M2YtNGNiOC04M2Y4LTlhOTIyZjczMThiMiIsImNsaWVudFNlY3JldCI6InRweHNhdHp3dnVudmF0VWcifQ.l-vCxtkLqKGaodFfYWh6eSoakQ3fpFmryMusIext2SU";

// Weight: Placement=3, Result=2, Event=1
const TYPE_WEIGHT = {
    "Placement": 3,
    "Result": 2,
    "Event": 1
};

async function getNotifications() {
    await Log("backend", "info", "service", "Fetching notifications from server");
    const res = await fetch("http://4.224.186.213/evaluation-service/notifications", {
        headers: { "Authorization": `Bearer ${ACCESS_TOKEN}` }
    });
    const data = await res.json();
    await Log("backend", "info", "service", `Fetched ${data.notifications.length} notifications`);
    return data.notifications;
}

function getPriorityScore(notification) {
    const weight = TYPE_WEIGHT[notification.Type] || 0;
    const recency = new Date(notification.Timestamp).getTime();
    // Score = weight * large_number + recency (so type dominates, recency breaks ties)
    return weight * 1e13 + recency;
}

async function getTopN(n = 10) {
    await Log("backend", "info", "controller", `Getting top ${n} priority notifications`);
    
    const notifications = await getNotifications();
    
    // Sort by priority score descending
    const sorted = notifications.sort((a, b) => {
        return getPriorityScore(b) - getPriorityScore(a);
    });

    const topN = sorted.slice(0, n);
    
    await Log("backend", "info", "controller", `Top ${n} notifications selected successfully`);
    
    return topN;
}

async function main() {
    await Log("backend", "info", "controller", "Priority Inbox started");
    
    const top10 = await getTopN(10);
    
    console.log("\n===== TOP 10 PRIORITY NOTIFICATIONS =====");
    top10.forEach((n, i) => {
        console.log(`${i + 1}. [${n.Type}] ${n.Message} — ${n.Timestamp}`);
    });

    await Log("backend", "info", "controller", "Priority Inbox completed");
}

main().catch(async (err) => {
    await Log("backend", "fatal", "service", `Priority inbox error: ${err.message}`);
    console.error(err);
});