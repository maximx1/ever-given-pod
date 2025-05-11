import Main from './layout/main';

export default function Home() {
  return (
    <Main>
      <h1 className='text-purple-200'>Welcome</h1>
      <a className='text-purple-200' href={`${process.env.NEXT_PUBLIC_API_BASE_URL}/f60236c3-81dd-47ba-b0ae-afd9229ac6f2/podcasts`}>Go to podcast list.</a>
    </Main>
  );
}
