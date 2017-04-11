# WorkflowLib
Library offering primitives to build and manage evented/nestable/configurable workflows in javascript.

#Description

The library is contained in AMD module define function. The exported object ha a single method **getFlow(name)**, which returns a singleton instance of a named workflow.

The obtained flow can then be configured or started.

Every node in the workflow has a handle function which represents the execution core of the node.
Its first argument is the flow itself. Every flow has the attribute **state** which contains the current custom state of the flow. Every node handle function is responsible to make the flow advance or abort it.

#Usage

Assume that the exported object is assigned to the global variable _wfManager_.

<pre>

wfManage.getFlow("test")
.addNode(function(mgr){
	mgr.state.count=3;
	mgr.state.again=1;
	mgr.state.value="example";
})
.addLoop(
	wfManager.getFlow("lp0").
	.addNode(function(mgr){
		console.log(mgr.state.value);
	}),
	function(state){
		state.count--;
		return count>0;
	}
)
.addChoice([
	wfManager.getFlow("end")
	.addNode(function(mgr){
		console.log("end");
		mgr.complete();
	}),
	wfMananger.getFlow("test")
],
function(state){
	var next = state.again;
	state.again--

	if(next>0)
		console.log("again");
	
	retrn next;
})
.start();

//prints
/*
	example
	example
	example
	again
	example
	example
	example
	end
*/

</pre>


#Flow object

A workflow is a instance of a private class **Workflow**.

Here its interface:

- **addNode(nodeFunction):self**: adds a node to the workflow. The logic of the node is given by the _nodeFunction_.
- **addFlow(flow):self**: adds an entire workflow to the worflow. Its node is completed when the inner flow is completed.
- **addChoice(flows, selector):self**: adds a conditional flow path. The various paths are flows in an array. The _selector_ function returns the array index of the path to walk.
- **addLoop(flow, whileCondition):self**: adds a loop in the workflow. The _flow_ is repeated untile the function _whileCondition_ return false.
- **next()**: when called, triger the execution of the next node in the workflow.
- **prev()**: when called, triger the execution of the previous node in the workflow.
- **start()**: resets the workflow execution and triggers the first node. The _start_ event is triggered.
- **complete()**: deems the workflow complete. The _complete_ event is triggered.
- **cancel()**: aborts the workflow. The _cancel_ event is triggered.