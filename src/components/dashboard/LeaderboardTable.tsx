import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  name: string;
  signups: number;
  costPerHead: number;
  conversion: number;
}

const getConversionColor = (value: number) => {
  if (value >= 30) return "bg-warroom-success/30 text-warroom-success";
  if (value >= 15) return "bg-warroom-success/15 text-warroom-success/80";
  return "bg-muted text-muted-foreground";
};

const LeaderboardTable = ({ data }: { data: LeaderboardEntry[] }) => {
  return (
    <div className="rounded border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h3 className="font-display text-sm uppercase tracking-wider text-muted-foreground">
          อันดับเซลส์
        </h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">#</TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">ชื่อ</TableHead>
            <TableHead className="text-right text-xs uppercase tracking-wider text-muted-foreground">สมัคร</TableHead>
            <TableHead className="text-right text-xs uppercase tracking-wider text-muted-foreground">ต้นทุน/หัว</TableHead>
            <TableHead className="text-right text-xs uppercase tracking-wider text-muted-foreground">% คอนเวอร์ชั่น</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                ยังไม่มีข้อมูล
              </TableCell>
            </TableRow>
          ) : (
            data.map((entry, i) => (
              <TableRow key={i} className="border-border">
                <TableCell className="font-display text-primary">{i + 1}</TableCell>
                <TableCell className="font-medium">{entry.name}</TableCell>
                <TableCell className="text-right">{entry.signups}</TableCell>
                <TableCell className="text-right">{entry.costPerHead}</TableCell>
                <TableCell className="text-right">
                  <span className={cn("rounded px-2 py-0.5 text-xs font-medium", getConversionColor(entry.conversion))}>
                    {entry.conversion.toFixed(1)}%
                  </span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default LeaderboardTable;
