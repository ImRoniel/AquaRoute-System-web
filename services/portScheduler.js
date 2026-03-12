// C:\xampp\htdocs\AquaRoute-System-web\services\portScheduler.js
const DEBUG = require('../config/debug');
const Port = require('../models/port');

class PortScheduler {
    constructor() {
        this.portModel = new Port();
        this.checkInterval = null;
        this.rushHourSchedule = {
            // Rush hours: 6AM-9AM and 5PM-8PM
            morningStart: 6,   // 6:00 AM
            morningEnd: 9,      // 9:00 AM
            eveningStart: 17,   // 5:00 PM
            eveningEnd: 20      // 8:00 PM
        };
    }

    // Check if current time is rush hour
    isRushHour() {
        const now = new Date();
        const hour = now.getHours();
        
        const isMorningRush = hour >= this.rushHourSchedule.morningStart && 
                              hour < this.rushHourSchedule.morningEnd;
        const isEveningRush = hour >= this.rushHourSchedule.eveningStart && 
                              hour < this.rushHourSchedule.eveningEnd;
        
        return isMorningRush || isEveningRush;
    }

    // Get status based on time
    getScheduledStatus() {
        return this.isRushHour() ? 'open' : 'closed';
    }

    // Update all ports based on schedule
    async updateAllPorts() {
        try {
            const newStatus = this.getScheduledStatus();
            DEBUG.log('PORT SCHEDULER', `Updating all ports to: ${newStatus}`);
            
            // Get all ports
            const ports = await this.portModel.getAllPorts();
            
            const updatePromises = ports.map(port => 
                this.portModel.updateStatus(port.id, newStatus)
            );
            
            await Promise.all(updatePromises);
            
            DEBUG.success('PORT SCHEDULER', `Updated ${ports.length} ports to ${newStatus}`);
            
            return { success: true, status: newStatus, count: ports.length };
        } catch (error) {
            DEBUG.error('PORT SCHEDULER', 'Error updating ports', error);
            return { success: false, error: error.message };
        }
    }

    // Start the scheduler
    startScheduler(io) {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }

        // Check every minute
        this.checkInterval = setInterval(async () => {
            try {
                const currentStatus = this.getScheduledStatus();
                
                // Check if any port needs updating
                const ports = await this.portModel.getAllPorts();
                const portsToUpdate = ports.filter(p => p.status !== currentStatus);
                
                if (portsToUpdate.length > 0) {
                    DEBUG.log('PORT SCHEDULER', `Found ${portsToUpdate.length} ports need status update`);
                    
                    // Update all ports
                    const result = await this.updateAllPorts();
                    
                    // Emit to all connected clients
                    if (io && result.success) {
                        io.emit('ports-updated', {
                            status: result.status,
                            timestamp: new Date().toISOString(),
                            message: `Ports are now ${result.status} for ${this.isRushHour() ? 'rush hour' : 'night time'}`
                        });
                    }
                }
            } catch (error) {
                DEBUG.error('PORT SCHEDULER', 'Error in scheduler loop', error);
            }
        }, 60000); // Check every minute

        DEBUG.log('PORT SCHEDULER', 'Scheduler started - checking every minute');
    }

    // Stop the scheduler
    stopScheduler() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            DEBUG.log('PORT SCHEDULER', 'Scheduler stopped');
        }
    }

    // Get current schedule info
    getScheduleInfo() {
        return {
            isRushHour: this.isRushHour(),
            currentStatus: this.getScheduledStatus(),
            schedule: this.rushHourSchedule,
            nextChange: this.getNextChangeTime()
        };
    }

    // Calculate next status change time
    getNextChangeTime() {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        
        const { morningStart, morningEnd, eveningStart, eveningEnd } = this.rushHourSchedule;
        
        let nextChange = new Date(now);
        
        if (hour < morningStart) {
            // Before morning rush: next change at morningStart
            nextChange.setHours(morningStart, 0, 0, 0);
        } else if (hour < morningEnd) {
            // During morning rush: next change at morningEnd
            nextChange.setHours(morningEnd, 0, 0, 0);
        } else if (hour < eveningStart) {
            // Between rushes: next change at eveningStart
            nextChange.setHours(eveningStart, 0, 0, 0);
        } else if (hour < eveningEnd) {
            // During evening rush: next change at eveningEnd
            nextChange.setHours(eveningEnd, 0, 0, 0);
        } else {
            // After evening rush: next change tomorrow morning
            nextChange.setDate(nextChange.getDate() + 1);
            nextChange.setHours(morningStart, 0, 0, 0);
        }
        
        return nextChange.toISOString();
    }
}

module.exports = PortScheduler;