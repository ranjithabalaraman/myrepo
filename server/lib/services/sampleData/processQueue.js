'use strict';

function ProcessQueue() {

    this.eventQueue = {};
    this.promiseQueue = {};
}

var instance = new ProcessQueue();

module.exports = instance;


ProcessQueue.prototype.isEventQueueEmpty = function(projectId){
    return !(this.eventQueue[projectId] && this.eventQueue[projectId].length > 0);
};


ProcessQueue.prototype.resolvePromiseQueue = function(projectId){

    if(this.isEventQueueEmpty(projectId)){

        while(this.promiseQueue && this.promiseQueue[projectId] && this.promiseQueue[projectId].length > 0){
            var promise = this.promiseQueue[projectId].shift();
            promise.resolve(projectId);
        }
    }
};

ProcessQueue.prototype.addPromiseInQueue = function(projectId, promise){

    if(!this.promiseQueue[projectId]){
        this.promiseQueue[projectId] = [promise];
    }else{
        this.promiseQueue[projectId].push(promise);
    }

};
