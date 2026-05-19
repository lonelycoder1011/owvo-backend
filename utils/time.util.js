export const isWithinWorkingHours = () => {
  const now = new Date();

  const start = new Date();
  start.setHours(8, 0, 0, 0);

  const end = new Date();
  end.setHours(17, 30, 0, 0); 
  return now >= start && now <= end;
};
