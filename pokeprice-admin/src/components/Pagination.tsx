import { useListContext } from 'react-admin';
import {Button, Grid, InputLabel, MenuItem, Select, Toolbar, Typography} from '@material-ui/core';
import ChevronLeft from '@material-ui/icons/ChevronLeft';
import ChevronRight from '@material-ui/icons/ChevronRight';
import {SelectInputProps} from "@material-ui/core/Select/SelectInput";

export const Pagination = (props:{withPages?:boolean}) => {
  const {
    filterValues,
    displayedFilters,
    setFilters,
    ids,
    perPage,
    setPerPage,
    page,
    setPage,
  } = useListContext();
  const onPrevious = () => {
    if (props.withPages) {
      setPage(Math.max(1, page - 1))
    } else {
      const firstResultId = ids[0];
      const filters = {
        ...filterValues,
        endAtId: firstResultId
      }
      setFilters(filters, displayedFilters)
    }

  }

  const onNext = () => {
    if (props.withPages) {
      setPage(page + 1)
    } else {
      const lastResultId = ids[ids.length - 1];
      const filters = {
        ...filterValues,
        startAfterId: lastResultId
      }
      setFilters(filters, displayedFilters)
    }

  }

  const onRowsPerPageChange:SelectInputProps['onChange'] = (event) => {
    const newValue = Number(event.target.value);
    setPerPage(newValue);
  }

  return (
    <Toolbar >
      <Button
        color="primary"
        key="prev"
        onClick={onPrevious}
      >
        <ChevronLeft />
        Prev
      </Button>
      <Button
        color="primary"
        key="next"
        onClick={onNext}
      >
        Next
        <ChevronRight />
      </Button>
      <InputLabel id='rows-per-page-label'>
        Rows per page:
      </InputLabel>
      <Select
        labelId='rows-per-page-label'
        onChange={onRowsPerPageChange}
        value={perPage}
      >
        <MenuItem value={10}>10</MenuItem>
        <MenuItem value={25}>25</MenuItem>
        <MenuItem value={50}>50</MenuItem>
        <MenuItem value={100}>100</MenuItem>
      </Select>

    </Toolbar>
  );
}