import { FC } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import PersonIcon from "@mui/icons-material/Person";
import {
  IUserWithAddresses,
  IUserWithRoles,
} from "@0xflick/ordinals-rbac-models";
import { UserAvatar } from "@/components/UserAvatar";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
export const AppHeader: FC<{
  user?: IUserWithRoles | IUserWithAddresses;
}> = ({ user }) => {
  return (
    <>
      <Box display="flex" alignItems="center" gap={2}>
        {user ? (
          <UserAvatar user={user} />
        ) : (
          <Avatar>
            <PersonIcon />
          </Avatar>
        )}
        <Typography variant="h5" flexGrow={1}>
          {user?.handle}
        </Typography>
        <Button variant="outlined" color="primary" href="/app/profile">
          Edit Profile
        </Button>
      </Box>
      <Box display="flex" alignItems="center" gap={2} marginTop={4}>
        <Typography variant="h5">Inscriptions</Typography>
      </Box>
      <Divider sx={{ my: 2 }} />
    </>
  );
};
