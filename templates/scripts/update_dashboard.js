#!/usr/bin/env node
/**
 * Claw Control Dashboard Update Script
 * 
 * Usage:
 *   node update_dashboard.js --agent "Goku" --status "working" --message "Starting task..."
 * 
 * Environment:
 *   CLAW_CONTROL_URL - Your Claw Control backend URL (default: http://localhost:3001)
 *   CLAW_CONTROL_API_KEY - Optional API key if authentication is enabled
 */

const API_URL = process.env.CLAW_CONTROL_URL || 'http://localhost:3001';
const API_KEY = process.env.CLAW_CONTROL_API_KEY || '';

// Map agent names/roles to IDs - customize this for your team!
const AGENT_MAPPING = {
  // DBZ Theme (default)
  'goku': 1,
  'vegeta': 2,
  'piccolo': 3,
  'gohan': 4,
  'bulma': 5,
  'trunks': 6,
  
  // Role-based aliases
  'coordinator': 1,
  'backend': 2,
  'architect': 3,
  'research': 4,
  'devops': 5,
  'frontend': 5,
  'deploy': 6,
  
  // Add your own mappings here!
};

function parseArgs(args) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
      result[key] = value;
      if (value !== true) i++;
    }
  }
  return result;
}

async function updateDashboard() {
  const args = parseArgs(process.argv.slice(2));
  
  const agentName = (args.agent || 'coordinator').toLowerCase();
  const status = args.status || 'idle';
  const message = args.message;
  const taskId = args.task;
  const taskStatus = args['task-status'];
  
  const agentId = AGENT_MAPPING[agentName] || parseInt(agentName) || 1;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
  };
  
  try {
    // Update agent status
    const agentRes = await fetch(`${API_URL}/api/agents/${agentId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ status })
    });
    
    if (!agentRes.ok) {
      throw new Error(`Agent update failed: ${agentRes.status}`);
    }
    
    console.log(`✅ Agent ${agentName} (ID: ${agentId}) → ${status}`);
    
    // Post message if provided
    if (message) {
      const msgRes = await fetch(`${API_URL}/api/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ agent_id: agentId, message })
      });
      
      if (msgRes.ok) {
        console.log(`💬 Message posted to feed`);
      }
    }
    
    // Update task if provided
    if (taskId && taskStatus) {
      const taskRes = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: taskStatus })
      });
      
      if (taskRes.ok) {
        console.log(`📋 Task #${taskId} → ${taskStatus}`);
      }
    }
    
  } catch (err) {
    console.error('❌ Dashboard update failed:', err.message);
    process.exit(1);
  }
}

updateDashboard();
