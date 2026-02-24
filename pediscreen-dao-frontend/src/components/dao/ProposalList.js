"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProposalList = void 0;
var react_1 = require("react");
var DAOContext_1 = require("../../contexts/DAOContext");
var Card_1 = require("../ui/Card");
var Button_1 = require("../ui/Button");
var shortenAddress_1 = require("../../utils/shortenAddress");
var lucide_react_1 = require("lucide-react");
function getStatusIcon(status) {
    switch (status) {
        case "active":
            return <lucide_react_1.Vote className="h-5 w-5 text-blue-600"/>;
        case "succeeded":
            return <lucide_react_1.CheckCircle className="h-5 w-5 text-green-600"/>;
        case "queued":
            return <lucide_react_1.Clock className="h-5 w-5 text-yellow-600"/>;
        case "executed":
            return <lucide_react_1.CheckCircle className="h-5 w-5 text-green-800"/>;
        case "defeated":
            return <lucide_react_1.XCircle className="h-5 w-5 text-red-600"/>;
        default:
            return <lucide_react_1.Clock className="h-5 w-5 text-gray-400"/>;
    }
}
function getStatusColor(status) {
    switch (status) {
        case "active":
            return "bg-blue-100 text-blue-800";
        case "succeeded":
            return "bg-green-100 text-green-800";
        case "queued":
            return "bg-yellow-100 text-yellow-800";
        case "executed":
            return "bg-green-200 text-green-900";
        case "defeated":
            return "bg-red-100 text-red-800";
        default:
            return "bg-gray-100 text-gray-700";
    }
}
var ProposalList = function () {
    var _a = (0, DAOContext_1.useDAO)(), proposals = _a.proposals, voteOnProposal = _a.voteOnProposal, queueProposal = _a.queueProposal, executeProposal = _a.executeProposal;
    return (<Card_1.Card className="border-0 shadow-xl">
      <Card_1.CardHeader>
        <Card_1.CardTitle className="flex items-center gap-2">
          <lucide_react_1.Vote className="h-6 w-6"/>
          Active Proposals
        </Card_1.CardTitle>
      </Card_1.CardHeader>
      <Card_1.CardContent className="space-y-4">
        {proposals.length === 0 ? (<div className="py-12 text-center text-gray-500">
            No proposals yet. Create the first one!
          </div>) : (proposals.map(function (proposal) { return (<div key={proposal.id} className="rounded-2xl border p-6 transition-all hover:shadow-md">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={"flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ".concat(getStatusColor(proposal.status))}>
                    {getStatusIcon(proposal.status)}
                    <span className="ml-1">{proposal.status.toUpperCase()}</span>
                  </div>
                  <span className="font-mono text-sm text-gray-500">
                    #{proposal.id}
                  </span>
                </div>
              </div>

              <h3 className="mb-2 text-xl font-bold">{proposal.title}</h3>
              <p className="mb-6 line-clamp-3 text-gray-600">
                {proposal.description}
              </p>

              <div className="mb-6 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {proposal.forVotes}
                  </div>
                  <div className="text-gray-500">For</div>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {proposal.againstVotes}
                  </div>
                  <div className="text-gray-500">Against</div>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 text-center">
                  <div className="font-mono">
                    {proposal.targets[0]
                ? (0, shortenAddress_1.shortenAddress)(proposal.targets[0])
                : "—"}
                  </div>
                  <div className="text-xs text-gray-500">Target</div>
                </div>
                {proposal.eta != null && (<div className="rounded-xl bg-indigo-50 p-3 text-center">
                    <div className="font-bold">
                      {proposal.eta ? "Ready" : "Pending"}
                    </div>
                    <div className="text-xs text-indigo-600">Execute</div>
                  </div>)}
              </div>

              <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row">
                <Button_1.Button variant="outline" size="sm" onClick={function () { return voteOnProposal(proposal.id, 1); }} className="flex-1">
                  Vote For
                </Button_1.Button>
                <Button_1.Button variant="outline" size="sm" onClick={function () { return voteOnProposal(proposal.id, 0); }} className="flex-1">
                  Vote Against
                </Button_1.Button>
                {proposal.status === "succeeded" && (<Button_1.Button variant="outline" size="sm" onClick={function () { return queueProposal(proposal.id); }} className="flex-1">
                    Queue
                  </Button_1.Button>)}
                {proposal.status === "queued" && (<Button_1.Button onClick={function () { return executeProposal(proposal.id); }} className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                    Execute (after timelock)
                  </Button_1.Button>)}
              </div>
            </div>); }))}
      </Card_1.CardContent>
    </Card_1.Card>);
};
exports.ProposalList = ProposalList;
