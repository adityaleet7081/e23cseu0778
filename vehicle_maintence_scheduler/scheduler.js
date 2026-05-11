const { Log } = require('../logging_middleware/logger');

const ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJlMjNjc2V1MDc3OEBiZW5uZXR0LmVkdS5pbiIsImV4cCI6MTc3ODQ4MTU3NiwiaWF0IjoxNzc4NDgwNjc2LCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiN2E5ZmNiZDctY2ZlYS00NTU1LTgwMTctNjYxNDQ2NWNlM2Q2IiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoiYWRpdHlhIHByYXRhcCBzaW5naCIsInN1YiI6IjkzYjJmYmU5LTI2M2YtNGNiOC04M2Y4LTlhOTIyZjczMThiMiJ9LCJlbWFpbCI6ImUyM2NzZXUwNzc4QGJlbm5ldHQuZWR1LmluIiwibmFtZSI6ImFkaXR5YSBwcmF0YXAgc2luZ2giLCJyb2xsTm8iOiJlMjNjc2V1MDc3OCIsImFjY2Vzc0NvZGUiOiJUZkR4Z3IiLCJjbGllbnRJRCI6IjkzYjJmYmU5LTI2M2YtNGNiOC04M2Y4LTlhOTIyZjczMThiMiIsImNsaWVudFNlY3JldCI6InRweHNhdHp3dnVudmF0VWcifQ.xO93iQFwIMYXMAzwiLMMo-0xLZujQtN2EMEdMhIcWBw";
// Fetch all depots from API
async function getDepots() {
    await Log("backend", "info", "service", "Fetching depots from evaluation server");
    const res = await fetch("http://4.224.186.213/evaluation-service/depots", {
        headers: { "Authorization": `Bearer ${ACCESS_TOKEN}` }
    });
    const data = await res.json();
    await Log("backend", "info", "service", `Fetched ${data.depots.length} depots successfully`);
    return data.depots;
}

// Fetch all vehicles/tasks from API
async function getVehicles() {
    await Log("backend", "info", "service", "Fetching vehicles from evaluation server");
    const res = await fetch("http://4.224.186.213/evaluation-service/vehicles", {
        headers: { "Authorization": `Bearer ${ACCESS_TOKEN}` }
    });
    const data = await res.json();
    await Log("backend", "info", "service", `Fetched ${data.vehicles.length} vehicles successfully`);
    return data.vehicles;
}

// 0/1 Knapsack Algorithm - picks best tasks within mechanic hour budget
function knapsack(tasks, capacity) {
    const n = tasks.length;
    // dp[i][w] = max impact using first i tasks with w hours budget
    const dp = Array.from({ length: n + 1 }, () => Array(capacity + 1).fill(0));

    for (let i = 1; i <= n; i++) {
        const { Duration, Impact } = tasks[i - 1];
        for (let w = 0; w <= capacity; w++) {
            if (Duration > w) {
                dp[i][w] = dp[i - 1][w];
            } else {
                dp[i][w] = Math.max(dp[i - 1][w], dp[i - 1][w - Duration] + Impact);
            }
        }
    }

    // Backtrack to find which tasks were selected
    let w = capacity;
    const selected = [];
    for (let i = n; i > 0; i--) {
        if (dp[i][w] !== dp[i - 1][w]) {
            selected.push(tasks[i - 1]);
            w -= tasks[i - 1].Duration;
        }
    }

    return { maxImpact: dp[n][capacity], selectedTasks: selected };
}

async function main() {
    await Log("backend", "info", "controller", "Vehicle Maintenance Scheduler started");

    const depots = await getDepots();
    const vehicles = await getVehicles();

    await Log("backend", "info", "controller", `Processing ${depots.length} depots with ${vehicles.length} total tasks`);

    const results = [];

    for (const depot of depots) {
        await Log("backend", "info", "controller", `Knapsack depot ${depot.ID} hrs:${depot.MechanicHours}`);

        const { maxImpact, selectedTasks } = knapsack(vehicles, depot.MechanicHours);

        await Log("backend", "info", "controller", `Depot ${depot.ID}: tasks=${selectedTasks.length} impact=${maxImpact}`);

        results.push({
            depotID: depot.ID,
            mechanicHours: depot.MechanicHours,
            totalImpact: maxImpact,
            tasksSelected: selectedTasks.length,
            tasks: selectedTasks.map(t => t.TaskID)
        });
    }

    await Log("backend", "info", "controller", "Vehicle Maintenance Scheduler completed successfully");

    console.log("\n===== RESULTS =====");
    console.log(JSON.stringify(results, null, 2));
}

main().catch(async (err) => {
    await Log("backend", "fatal", "controller", `Scheduler crashed: ${err.message}`);
    console.error(err);
});