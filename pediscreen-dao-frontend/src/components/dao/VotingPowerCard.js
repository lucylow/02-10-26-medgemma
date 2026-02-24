"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VotingPowerCard = void 0;
var react_1 = require("react");
var wagmi_1 = require("wagmi");
var DAOContext_1 = require("../../contexts/DAOContext");
var Card_1 = require("../ui/Card");
var Button_1 = require("../ui/Button");
var lucide_react_1 = require("lucide-react");
var VotingPowerCard = function () {
    var _a = (0, wagmi_1.useAccount)(), address = _a.address, isConnected = _a.isConnected;
    var _b = (0, DAOContext_1.useDAO)(), userVotingPower = _b.userVotingPower, delegateTokens = _b.delegateTokens;
    if (!isConnected || !address) {
        return (<Card_1.Card>
        <Card_1.CardHeader>
          <Card_1.CardTitle className="flex items-center gap-2">
            <lucide_react_1.Vote className="h-5 w-5"/>
            Voting Power
          </Card_1.CardTitle>
        </Card_1.CardHeader>
        <Card_1.CardContent>
          <p className="text-sm text-gray-500">
            Connect your wallet to see your PSDAO voting power and delegate.
          </p>
        </Card_1.CardContent>
      </Card_1.Card>);
    }
    return (<Card_1.Card>
      <Card_1.CardHeader>
        <Card_1.CardTitle className="flex items-center gap-2">
          <lucide_react_1.Vote className="h-5 w-5"/>
          Voting Power
        </Card_1.CardTitle>
      </Card_1.CardHeader>
      <Card_1.CardContent className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <lucide_react_1.User className="h-5 w-5 text-blue-600"/>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-sm text-gray-600">
              {address}
            </p>
            <p className="text-xl font-bold text-gray-900">
              {userVotingPower}{" "}
              <span className="text-sm font-normal text-gray-500">PSDAO</span>
            </p>
          </div>
        </div>
        <Button_1.Button variant="outline" size="sm" onClick={function () { return delegateTokens(); }} className="w-full">
          Delegate to self (activate voting power)
        </Button_1.Button>
      </Card_1.CardContent>
    </Card_1.Card>);
};
exports.VotingPowerCard = VotingPowerCard;
