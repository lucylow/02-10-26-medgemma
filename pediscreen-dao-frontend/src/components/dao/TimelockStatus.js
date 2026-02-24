"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimelockStatus = void 0;
var react_1 = require("react");
var DAOContext_1 = require("../../contexts/DAOContext");
var Card_1 = require("../ui/Card");
var shortenAddress_1 = require("../../utils/shortenAddress");
var lucide_react_1 = require("lucide-react");
var TimelockStatus = function () {
    var _a = (0, DAOContext_1.useDAO)(), timelockDelay = _a.timelockDelay, treasuryAddress = _a.treasuryAddress, timelockAddress = _a.timelockAddress;
    return (<Card_1.Card>
      <Card_1.CardHeader>
        <Card_1.CardTitle className="flex items-center gap-2">
          <lucide_react_1.Clock className="h-5 w-5"/>
          Timelock & Treasury
        </Card_1.CardTitle>
      </Card_1.CardHeader>
      <Card_1.CardContent className="space-y-4">
        <div className="rounded-xl bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">Timelock delay</p>
          <p className="text-lg font-bold text-amber-900">{timelockDelay}</p>
          <p className="mt-1 text-xs text-amber-700">
            Successful proposals must wait this period before execution.
          </p>
        </div>
        {timelockAddress && (<div className="flex items-center gap-2 text-sm">
            <lucide_react_1.Clock className="h-4 w-4 text-gray-400"/>
            <span className="text-gray-500">Timelock:</span>
            <span className="font-mono text-gray-700">
              {(0, shortenAddress_1.shortenAddress)(timelockAddress, 6)}
            </span>
          </div>)}
        {treasuryAddress && (<div className="flex items-center gap-2 text-sm">
            <lucide_react_1.Wallet className="h-4 w-4 text-gray-400"/>
            <span className="text-gray-500">Treasury:</span>
            <span className="font-mono text-gray-700">
              {(0, shortenAddress_1.shortenAddress)(treasuryAddress, 6)}
            </span>
          </div>)}
      </Card_1.CardContent>
    </Card_1.Card>);
};
exports.TimelockStatus = TimelockStatus;
